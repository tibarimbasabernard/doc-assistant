import io
import os

import pdfplumber
import google.generativeai as genai
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


def analyze_with_gemini(text: str) -> dict:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""You are a document analysis assistant. Analyze the following document text and return a JSON object with exactly these fields:
- "title": the document title (string, or "Unknown" if not found)
- "author": the document author (string, or "Unknown" if not found)
- "summary": a clear 3-5 sentence summary of the document (string)
- "main_content": the key points or main sections of the document as a bulleted list (string)

Return ONLY valid JSON, no markdown code blocks, no extra text.

Document text:
{text[:12000]}"""

    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    import json
    return json.loads(raw)


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

        # Analyze with Gemini
        if not settings.GEMINI_API_KEY:
            return Response(
                {'error': 'AI service is not configured. Please set the GEMINI_API_KEY.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            result = analyze_with_gemini(text)
        except Exception as e:
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({
            'filename': file.name,
            'title': result.get('title', 'Unknown'),
            'author': result.get('author', 'Unknown'),
            'summary': result.get('summary', ''),
            'main_content': result.get('main_content', ''),
        }, status=status.HTTP_200_OK)
