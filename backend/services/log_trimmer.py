# backend/services/log_trimmer.py
import re
from typing import List, Tuple

class LogTrimmer:
    """Service to strip ANSI escape sequences and cleanly extract error sections without noise or harmless warnings."""

    def __init__(self, max_chars: int = 12000):
        self.max_chars = max_chars
        self.ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        self.error_patterns: List[re.Pattern] = [
            re.compile(r'(?i)(##\[error\]|ERROR:\s*|\berror\b\s+during\s+build|transform failed|syntaxerror|typeerror|referenceerror|assertionerror)', re.MULTILINE),
            re.compile(r'(?i)(expected\s+".*?"\s+but\s+found|unexpected\s+".*?"|unexpected\s+token|cannot find name|cannot find module)', re.MULTILINE),
            re.compile(r'(?i)(FAIL\s+|FAILED\s+|npm ERR!|yarn error|pip error|ModuleNotFoundError|traceback \(most recent call last\))', re.MULTILINE),
            re.compile(r'(?i)(process completed with exit code [1-9]|command failed with exit code)', re.MULTILINE)
        ]
        self.ignore_notice_pattern = re.compile(r'(?i)(npm warn|deprecationwarning|warning:|\bwarn\b|found 0 vulnerabilities|looking for funding)', re.MULTILINE)

    def trim(self, raw_log: str) -> str:
        """Strips ANSI codes and extracts high-priority error sections cleanly."""
        if not raw_log:
            return ""

        # 1. Strip ANSI escape sequences
        clean_log = self.ansi_escape.sub('', raw_log).replace('\r\n', '\n')

        # If log is already small enough, return as-is
        if len(clean_log) <= self.max_chars:
            return clean_log

        lines = clean_log.split('\n')
        total_lines = len(lines)
        if total_lines == 0:
            return ""

        # 2. Collect matched error line indices, skipping harmless warnings
        matched_indices = []
        for i, line in enumerate(lines):
            line_str = line.strip()
            if not line_str:
                continue
            # Skip benign warnings unless they also have fatal error indicators
            if self.ignore_notice_pattern.search(line_str) and "error" not in line_str.lower():
                continue

            for pat in self.error_patterns:
                if pat.search(line_str):
                    matched_indices.append(i)
                    break

        # 3. Create context windows around error occurrences
        raw_ranges: List[Tuple[int, int]] = []
        for idx in matched_indices:
            start = max(0, idx - 6)
            end = min(total_lines - 1, idx + 12)
            raw_ranges.append((start, end))

        # Always include the last 20 lines (summary, final error exit code)
        tail_start = max(0, total_lines - 20)
        raw_ranges.append((tail_start, total_lines - 1))

        if not raw_ranges:
            # Fallback if no specific error keyword matched: return last max_chars cleanly on line boundaries
            tail_lines = clean_log[-self.max_chars:].split('\n')
            return "...[LOG TRUNCATED (FIRST PORTION EXCLUDED)]...\n" + "\n".join(tail_lines[1:])

        # 4. Merge overlapping / adjacent intervals
        raw_ranges.sort(key=lambda r: r[0])
        merged_ranges: List[Tuple[int, int]] = []
        for r_start, r_end in raw_ranges:
            if not merged_ranges:
                merged_ranges.append((r_start, r_end))
            else:
                prev_start, prev_end = merged_ranges[-1]
                # If overlapping or adjacent (gap <= 3 lines), merge
                if r_start <= prev_end + 3:
                    merged_ranges[-1] = (prev_start, max(prev_end, r_end))
                else:
                    merged_ranges.append((r_start, r_end))

        # 5. Assemble formatted log blocks
        blocks: List[str] = []
        prev_end = 0
        for b_start, b_end in merged_ranges:
            skipped = b_start - prev_end
            if skipped > 2:
                blocks.append(f"\n... [Skipped {skipped} setup/intermediate lines] ...\n")
            blocks.append("\n".join(lines[b_start:b_end + 1]))
            prev_end = b_end + 1

        result = "\n".join(blocks).strip()

        # If still exceeding max_chars, trim gracefully from top of result on line boundary
        if len(result) > self.max_chars:
            trimmed_lines = result[-self.max_chars:].split('\n')
            return "...[LOG TRUNCATED FOR LLM CONTEXT LIMIT]...\n" + "\n".join(trimmed_lines[1:])

        return result


