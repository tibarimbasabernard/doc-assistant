"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import ResultCard from "./components/ResultCard";

type AnalysisResult = {
  filename: string;
  title: string;
  author: string;
  summary: string;
  main_content: string;
};

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const ACCEPTED_EXT = [".pdf", ".docx", ".doc"];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function isValidFile(f: File): boolean {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    return (
      ACCEPTED_TYPES.includes(f.type) ||
      ACCEPTED_EXT.includes(`.${ext}`)
    );
  }

  function handleFileSelect(f: File) {
    setError(null);
    setResult(null);
    if (!isValidFile(f)) {
      setError("Unsupported file type. Please upload a PDF or Word (.docx) document.");
      setFile(null);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum allowed size is 10 MB.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/upload/`,
        { method: "POST", body: formData }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">Document Assistant</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI-Powered Document Analysis</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Analyze Your Document in Seconds
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Upload a PDF or Word document and get an AI-generated summary, key insights, and structured breakdown instantly.
          </p>
        </div>

        {/* Upload area */}
        {!result && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 mb-6">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                ${dragging
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
                  : file
                  ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                  : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800"
                }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={onInputChange}
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-1">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="mt-1 text-xs text-slate-400 hover:text-red-500 transition-colors underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      Drag & drop your file here, or <span className="text-blue-600">browse</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-1">Supports PDF and Word (.docx) — max 10 MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-red-700 dark:text-red-400">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="mt-6 w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analyzing document…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyze Document
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {result && <ResultCard result={result} onReset={handleReset} />}
      </main>

      <footer className="text-center py-8 text-sm text-slate-400 dark:text-slate-600">
        Powered by Google Gemini API · Built with Next.js &amp; Django
      </footer>
    </div>
  );
}
