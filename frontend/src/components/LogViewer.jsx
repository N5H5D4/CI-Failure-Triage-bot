// frontend/src/components/LogViewer.jsx
import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export default function LogViewer({ logText, title = "Trimmed CI Console Log" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(logText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!logText) {
    return (
      <div className="p-8 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-500 font-mono text-xs">
        No log content captured for this run.
      </div>
    );
  }

  const lines = logText.split('\n');

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-inner">
      <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono text-zinc-300 font-semibold">{title}</span>
          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
            {lines.length} lines ({logText.length} chars)
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition border border-zinc-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Log'}</span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto max-h-96 font-mono text-xs leading-relaxed text-zinc-300 space-y-0.5 selection:bg-indigo-900">
        {lines.map((line, idx) => {
          const isError = /error|failed|fail|panic|fatal|assert/i.test(line);
          const isWarning = /warn|warning/i.test(line);
          const isHeader = line.startsWith('---') || line.startsWith('##[');

          let colorClass = 'text-zinc-300';
          if (isError) colorClass = 'text-red-400 bg-red-950/40 px-1 rounded font-semibold';
          else if (isWarning) colorClass = 'text-amber-300';
          else if (isHeader) colorClass = 'text-blue-400 font-bold';

          return (
            <div key={idx} className="flex hover:bg-zinc-900/60 rounded px-1">
              <span className="w-10 flex-shrink-0 select-none text-zinc-600 text-right pr-3 font-mono text-[11px]">
                {idx + 1}
              </span>
              <span className={`break-all ${colorClass}`}>{line || ' '}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
