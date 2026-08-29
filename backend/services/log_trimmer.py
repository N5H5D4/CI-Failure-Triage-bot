# backend/services/log_trimmer.py
import re
from typing import List

class LogTrimmer:
    """Service to strip ANSI terminal escape sequences and intelligently extract error lines & tail logs."""

    def __init__(self, max_chars: int = 12000):
        # Default ~12,000 chars roughly equals ~3,000 LLM tokens
        self.max_chars = max_chars
        self.ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        self.error_patterns: List[re.Pattern] = [
            re.compile(r'(?i)(error|failed|failure|exception|traceback|panic|fatal|assert)', re.MULTILINE),
            re.compile(r'(?i)(npm ERR!|yarn error|pip error|ModuleNotFoundError|SyntaxError)', re.MULTILINE),
            re.compile(r'(?i)(FAIL\s+|FAILED\s+|AssertionError|TypeError|ReferenceError)', re.MULTILINE)
        ]

    def trim(self, raw_log: str) -> str:
        """Strips ANSI codes and extracts high-priority error sections + tail lines."""
        if not raw_log:
            return ""

        # 1. Strip ANSI escape sequences (colors, cursor movements)
        clean_log = self.ansi_escape.sub('', raw_log).replace('\r\n', '\n')

        # If log is already small enough, return as-is
        if len(clean_log) <= self.max_chars:
            return clean_log

        # 2. Extract error context lines and preserve the most recent log tail
        lines = clean_log.split('\n')
        total_lines = len(lines)

        highlighted_lines = []
        # Look for error indicators in all lines
        for i, line in enumerate(lines):
            for pat in self.error_patterns:
                if pat.search(line):
                    # grab window around error line
                    start = max(0, i - 3)
                    end = min(total_lines, i + 4)
                    highlighted_lines.extend(lines[start:end])
                    break

        # Remove consecutive duplicate lines
        deduped_errors = []
        for l in highlighted_lines:
            if not deduped_errors or deduped_errors[-1] != l:
                deduped_errors.append(l)

        error_excerpt = "\n".join(deduped_errors)

        # 3. Always include the bottom tail lines (where failures and summary exit codes reside)
        tail_chars = int(self.max_chars * 0.7)
        tail_part = clean_log[-tail_chars:]

        if deduped_errors and len(error_excerpt) > 100:
            combined = f"--- [DETECTED ERROR SIGNALS & STACK TRACES] ---\n{error_excerpt[:int(self.max_chars * 0.3)]}\n\n--- [TRAILING LOGS & SUMMARY] ---\n{tail_part}"
            if len(combined) > self.max_chars:
                return f"...[LOG TRUNCATED FOR LLM CONTEXT LIMIT]...\n" + combined[-self.max_chars:]
            return combined
        
        return f"...[LOG TRUNCATED (FIRST PORTION EXCLUDED)]...\n" + clean_log[-self.max_chars:]
