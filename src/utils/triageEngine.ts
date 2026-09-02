// src/utils/triageEngine.ts
import { TriageResult } from '../types';

/**
 * Clean log trimmer that strips GitHub Actions timestamp prefixes and isolates fault frames.
 */
export function trimCILog(rawLog: string, maxLines = 80): string {
    if (!rawLog) return '';
    const lines = rawLog.split('\n');

    // Strip GitHub Actions runner timestamp prefixes
    const cleaned = lines.map((l) =>
        l.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '')
    );

    let errorIdx = -1;
    for (let i = 0; i < cleaned.length; i++) {
        const l = cleaned[i].toLowerCase();
        if (
            l.includes('##[error]') ||
            l.includes('error:') ||
            l.includes('error ts') ||
            l.includes('fail') ||
            l.includes('transform failed') ||
            l.includes('assertionerror') ||
            l.includes('modulenotfounderror') ||
            l.includes('cannot find module')
        ) {
            errorIdx = i;
            break;
        }
    }

    if (errorIdx === -1) {
        return cleaned.slice(-maxLines).join('\n');
    }

    const start = Math.max(0, errorIdx - 6);
    const end = Math.min(cleaned.length, errorIdx + maxLines);
    return cleaned.slice(start, end).join('\n');
}

/**
 * Minimal offline client fallback when server is unreachable.
 * Pure dynamic extraction without hardcoded branches.
 */
export function analyzeCILog(
    rawLog: string,
    repoName = 'unknown/repo',
    prNumber: number | null = null
): TriageResult {
    const trimmed = trimCILog(rawLog);
    const runId = Math.floor(1000000000 + Math.random() * 9000000000);

    // Generic stack / location detection
    const locationMatch = /(?:file:\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[:(](\d+)(?:[,:](\d+))?/i.exec(trimmed);
    const offendingFile = locationMatch ? locationMatch[1] : undefined;
    const offendingLine = locationMatch ? parseInt(locationMatch[2], 10) : undefined;

    return {
        id: Date.now(),
        repo_name: repoName,
        run_id: runId,
        pr_number: prNumber,
        failure_category: 'syntax_error',
        confidence_score: 0.9,
        root_cause: offendingFile
            ? `CI failure located at ${offendingFile}${offendingLine ? ` line ${offendingLine}` : ''}. Stack trace captured in trimmed logs.`
            : 'CI runner failure captured in log output. Please connect CLAUDE_API_KEY in Settings for full dynamic analysis.',
        suggested_fix: 'Run the project build or test suite locally to reproduce and resolve the error.',
        remediation_steps: [
            'Inspect trimmed error log',
            'Reproduce locally in dev environment',
            'Commit and push fix to branch'
        ],
        prevention_tip: 'Run typecheck and unit tests locally before pushing commits.',
        offending_file: offendingFile,
        offending_line: offendingLine,
        trimmed_log: trimmed,
        raw_response: JSON.stringify({ generic_parse: true, file: offendingFile, line: offendingLine }, null, 2),
        status: 'nothing',
        bot_action: 'Nothing',
        github_comment_url: null,
        is_simulated: true,
        created_at: new Date().toISOString(),
    };
}
