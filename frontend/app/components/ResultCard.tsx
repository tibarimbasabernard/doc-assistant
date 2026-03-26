type AnalysisResult = {
  filename: string;
  title: string;
  author: string;
  summary: string;
  main_content: string;
};

type Props = {
  result: AnalysisResult;
  onReset: () => void;
};

export default function ResultCard({ result, onReset }: Props) {
  // Convert bullet-point text into array of lines for display
  const contentLines = result.main_content
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Analysis complete — {result.filename}
        </div>
        <button
          onClick={onReset}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload new document
        </button>
      </div>

      {/* Document metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoBox
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Title"
          value={result.title}
        />
        <InfoBox
          icon={
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          label="Author"
          value={result.author}
        />
      </div>

      {/* Summary */}
      <Section
        title="Summary"
        accent="blue"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        }
      >
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{result.summary}</p>
      </Section>

      {/* Key Points */}
      <Section
        title="Key Points"
        accent="indigo"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.015H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.015H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.015H3.75v-.015zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        }
      >
        {contentLines.length > 0 ? (
          <ul className="space-y-2">
            {contentLines.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{result.main_content}</p>
        )}
      </Section>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-slate-800 dark:text-slate-100 font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  icon,
  children,
}: {
  title: string;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const accentColors: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className={`flex items-center gap-2 font-semibold mb-3 ${accentColors[accent] ?? "text-slate-700"}`}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
