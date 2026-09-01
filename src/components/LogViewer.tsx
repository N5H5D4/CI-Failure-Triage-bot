import React, { useState } from 'react';
import { Copy, Check, WrapText, Download } from 'lucide-react';
import { theme } from '../styles/theme';

interface LogViewerProps {
  log: string;
  title?: string;
  maxHeight?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  log,
  title = 'Extracted Log Window & Error Trace',
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

  // Colorize log lines for clarity in terminal
  const formatLogLines = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let colorClass = 'text-slate-300';
      if (
        line.includes('ERROR') ||
        line.includes('##[error]') ||
        line.includes('AssertionError') ||
        line.includes('FAIL') ||
        line.includes('Traceback') ||
        line.includes('exit code 1') ||
        line.includes('exit code 2')
      ) {
        colorClass = 'text-rose-400 bg-rose-950/30 font-medium';
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
        colorClass = 'text-sky-400';
      } else if (line.includes('passed') || line.includes('SUCCESS')) {
        colorClass = 'text-emerald-400';
      }

      return (
        <div key={idx} className={`flex leading-relaxed ${colorClass}`}>
          <span className="select-none text-slate-500 w-9 shrink-0 text-right pr-3 font-mono text-[11px]">
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
    <div className={theme.cards.terminal}>
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-slate-300 font-sans text-xs font-medium ml-2">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-1 font-sans">
          <button
            onClick={() => setWrapText(!wrapText)}
            title="Toggle word wrap"
            className={`p-1.5 rounded-md text-xs border transition-colors cursor-pointer ${wrapText
              ? 'bg-slate-800 text-emerald-400 border-slate-700'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800'
              }`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownload}
            title="Download log file"
            className="p-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            id="copy-log-btn"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
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
        className={`p-4 overflow-y-auto overflow-x-auto bg-slate-950 ${maxHeight} selection:bg-emerald-900 selection:text-white`}
      >
        {log ? (
          formatLogLines(log)
        ) : (
          <div className="text-slate-500 italic py-4 text-center">
            No terminal log stream output recorded for this run.
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
