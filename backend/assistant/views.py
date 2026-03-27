import io
import json
import os

import pdfplumber
from google import genai
from groq import Groq
from docx import Document as DocxDocument
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser


ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = DocxDocument(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


PROMPT_TEMPLATE = """You are a document analysis assistant. Analyze the following document text and return a JSON object with exactly these fields:
- "title": the document title (string, or "Unknown" if not found)
- "author": the document author (string, or "Unknown" if not found)
- "summary": a clear 3-5 sentence summary of the document (string)
- "main_content": the key points or main sections of the document as a bulleted list (string)

Return ONLY valid JSON, no markdown code blocks, no extra text.

Document text:
{text}"""


def _sanitize_json(raw: str) -> str:
    """Escape unescaped control characters that appear inside JSON string values."""
    result = []
    in_string = False
    escape_next = False
    _escapes = {'\n': '\\n', '\r': '\\r', '\t': '\\t'}
    for ch in raw:
        if escape_next:
            result.append(ch)
            escape_next = False
        elif ch == '\\' and in_string:
            result.append(ch)
            escape_next = True
        elif ch == '"':
            in_string = not in_string
            result.append(ch)
        elif in_string and ord(ch) < 0x20:
            result.append(_escapes.get(ch, '\\u{:04x}'.format(ord(ch))))
        else:
            result.append(ch)
    return ''.join(result)


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()
    raw = _sanitize_json(raw)
    return json.loads(raw)


def analyze_with_gemini(text: str) -> dict:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    prompt = PROMPT_TEMPLATE.format(text=text[:12000])
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=prompt,
    )
    return _parse_json(response.text)


def analyze_with_groq(text: str) -> dict:
    client = Groq(api_key=settings.GROQ_API_KEY)
    prompt = PROMPT_TEMPLATE.format(text=text[:12000])
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return _parse_json(response.choices[0].message.content)


class DocumentUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')

        if not file:
            return Response(
                {'error': 'No file provided. Please upload a PDF or Word document.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate extension
        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Unsupported file type ".{ext}". Please upload a PDF or Word (.docx) file.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file size
        if file.size > MAX_FILE_SIZE:
            return Response(
                {'error': 'File is too large. Maximum allowed size is 10 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_bytes = file.read()

        # Extract text
        try:
            if ext == 'pdf':
                text = extract_text_from_pdf(file_bytes)
            else:
                text = extract_text_from_docx(file_bytes)
        except Exception as e:
            return Response(
                {'error': f'Failed to extract text from document: {str(e)}'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if not text.strip():
            return Response(
                {'error': 'The document appears to be empty or contains no readable text.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # Analyze — try Gemini first, fall back to Groq on quota errors
        if not settings.GEMINI_API_KEY and not settings.GROQ_API_KEY:
            return Response(
                {'error': 'AI service is not configured. Please set GEMINI_API_KEY or GROQ_API_KEY in .env.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        result = None

        # Try Gemini if key is present
        if settings.GEMINI_API_KEY:
            try:
                result = analyze_with_gemini(text)
            except Exception as e:
                err_str = str(e)
                quota_hit = '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str
                if not quota_hit or not settings.GROQ_API_KEY:
                    return Response(
                        {'error': f'AI analysis failed: {err_str}'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                # quota hit — fall through to Groq below

        # Use Groq if Gemini was skipped or hit quota
        if result is None:
            if not settings.GROQ_API_KEY:
                return Response(
                    {'error': 'Gemini quota exceeded and no Groq API key is configured.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            try:
                result = analyze_with_groq(text)
            except Exception as groq_err:
                return Response(
                    {'error': f'AI analysis failed (Groq): {str(groq_err)}'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response({
            'filename': file.name,
            'title': result.get('title', 'Unknown'),
            'author': result.get('author', 'Unknown'),
            'summary': result.get('summary', ''),
            'main_content': result.get('main_content', ''),
        }, status=status.HTTP_200_OK)
