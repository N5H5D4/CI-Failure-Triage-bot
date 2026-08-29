import React, { useState } from 'react';
import { Terminal, Copy, Check, WrapText, Download } from 'lucide-react';

interface LogViewerProps {
  log: string;
  title?: string;
  maxHeight?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  log,
  title = 'Trimmed Error & Stack Trace Window',
  maxHeight = 'max-h-96',
}) => {
  const [copied, setCopied] = useState(false);
  const [wrapText, setWrapText] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([log], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `ci-triage-log-${Date.now()}.log`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Colorize log lines for clarity in dark terminal
  const formatLogLines = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let colorClass = 'text-zinc-300';
      if (
        line.includes('ERROR') ||
        line.includes('##[error]') ||
        line.includes('AssertionError') ||
        line.includes('FAIL') ||
        line.includes('Traceback') ||
        line.includes('exit code 1') ||
        line.includes('exit code 2')
      ) {
        colorClass = 'text-red-400 bg-red-950/20 font-medium';
      } else if (
        line.includes('WARNING') ||
        line.includes('warn') ||
        line.includes('Timeout')
      ) {
        colorClass = 'text-amber-300';
      } else if (
        line.includes('[info]') ||
        line.includes('Collecting') ||
        line.includes('Running')
      ) {
        colorClass = 'text-blue-400';
      } else if (line.includes('passed') || line.includes('SUCCESS')) {
        colorClass = 'text-emerald-400';
      }

      return (
        <div key={idx} className={`flex leading-relaxed ${colorClass}`}>
          <span className="select-none text-zinc-600 w-9 shrink-0 text-right pr-3 font-mono text-[11px]">
            {idx + 1}
          </span>
          <span className={`${wrapText ? 'break-words' : 'whitespace-pre'} flex-1`}>
            {line || ' '}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-inner font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-zinc-400 font-sans text-xs font-medium ml-2">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-1 font-sans">
          <button
            onClick={() => setWrapText(!wrapText)}
            title="Toggle word wrap"
            className={`p-1.5 rounded-md text-xs border transition-colors ${
              wrapText
                ? 'bg-zinc-800 text-indigo-300 border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            title="Download log"
            className="p-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            id="copy-log-btn"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        className={`p-4 overflow-y-auto overflow-x-auto bg-black ${maxHeight} selection:bg-indigo-900 selection:text-white`}
      >
        {log ? (
          formatLogLines(log)
        ) : (
          <div className="text-zinc-600 italic py-4 text-center">
            No terminal log stream captured for this run.
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
