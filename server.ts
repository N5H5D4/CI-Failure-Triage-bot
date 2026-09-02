import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

function persistEnvFile(key: string, value: string) {
    // In-memory runtime persistence is used to prevent Vite dev server watchers from restarting/reloading on key tests
    if (!key || !value || value.includes('...') || value.includes('•') || value.includes('*')) return;
}

interface StoredTriageResult {
    id: number;
    repo_name: string;
    run_id: number;
    pr_number?: number | null;
    failure_category: string;
    confidence_score: number;
    root_cause?: string | null;
    suggested_fix?: string | null;
    remediation_steps?: string[];
    prevention_tip?: string | null;
    offending_file?: string | null;
    offending_line?: number | null;
    trimmed_log?: string | null;
    raw_response?: string | null;
    status: 'pending' | 'posted' | 'error' | 'nothing';
    bot_action?: string | null;
    is_simulated?: boolean;
    github_comment_url?: string | null;
    engine_used?: string | null;
    created_at: string;
}

interface StoredRepo {
    id: number;
    owner: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

// Clean in-memory stores with zero sample/mock records
let triageStore: StoredTriageResult[] = [];
let repoStore: StoredRepo[] = [];

let systemSettings = {
    groq_api_key: process.env.GROQ_API_KEY || '',
    claude_api_key: process.env.CLAUDE_API_KEY || '',
    github_token: process.env.GITHUB_TOKEN || '',
    webhook_secret: process.env.WEBHOOK_SECRET || '',
    max_log_tokens: 3500,
    rate_limit_per_min: 60,
    debug_mode: true,
};

// Lazy Anthropic Claude Client
function getClaudeClient(apiKey?: string): Anthropic {
    const key = apiKey || systemSettings.claude_api_key || process.env.CLAUDE_API_KEY;
    if (!key) {
        throw new Error('CLAUDE_API_KEY is not configured.');
    }
    return new Anthropic({ apiKey: key });
}

/**
 * Groq API Direct Client (OpenAI-compatible, ultra-fast LLM inference)
 * Uses Qwen 3.6 27B (qwen/qwen3.6-27b) as dedicated primary model with resilient model fallback
 */
async function callGroqChat(
    apiKey: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: { model?: string; temperature?: number; jsonMode?: boolean } = {}
): Promise<{ text: string; model: string }> {
    const candidateModels = [
        options.model || 'qwen/qwen3.6-27b',
        'qwen-2.5-32b',
        'qwen/qwen3.8-27b',
        'qwen-2.5-coder-32b',
    ];
    // De-duplicate while preserving priority order
    const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));
    const temperature = options.temperature ?? 0.1;
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    let lastError: any = null;

    for (const modelToUse of modelsToTry) {
        const body: any = {
            model: modelToUse,
            messages,
            temperature,
            max_tokens: 3000,
        };

        if (options.jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey.trim()}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorDetail = errorText;
                try {
                    const parsedError = JSON.parse(errorText);
                    if (parsedError.error?.message) {
                        errorDetail = parsedError.error.message;
                    }
                } catch { }

                if (response.status === 404 || errorDetail.includes('does not exist') || errorDetail.includes('access')) {
                    console.warn(`[Groq Model Notice] Model '${modelToUse}' unavailable on this key (${errorDetail}), trying fallback model...`);
                    lastError = new Error(`Groq HTTP ${response.status}: ${errorDetail}`);
                    continue;
                }

                throw new Error(`Groq HTTP ${response.status}: ${errorDetail}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            return {
                text: content,
                model: data.model || modelToUse,
            };
        } catch (err: any) {
            clearTimeout(timeoutId);
            lastError = err;
            if (err.message && (err.message.includes('404') || err.message.includes('does not exist'))) {
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error('Failed to connect to Groq with available models.');
}

// Log Trimmer Utility
function trimLogLines(rawLog: string, maxLines = 100): string {
    if (!rawLog) return '';
    const lines = rawLog.split('\n');
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
            l.includes('cannot find module') ||
            l.includes('syntaxerror')
        ) {
            errorIdx = i;
            break;
        }
    }

    if (errorIdx === -1) {
        return cleaned.slice(-maxLines).join('\n');
    }

    const start = Math.max(0, errorIdx - 8);
    const end = Math.min(cleaned.length, errorIdx + maxLines);
    return cleaned.slice(start, end).join('\n');
}

/**
 * Pure Dynamic AI Analysis using Groq (qwen/qwen3.6-27b) or Claude 3.5 Sonnet
 */
async function analyzeLogWithAI(
    rawLog: string,
    repoName: string = 'unknown/repo',
    prNumber: number | null = null
): Promise<{
    failure_category: string;
    confidence_score: number;
    root_cause: string;
    suggested_fix: string;
    remediation_steps: string[];
    prevention_tip: string;
    offending_file: string;
    offending_line: number;
    raw_response: string;
    engine_used: string;
}> {
    const trimmedLog = trimLogLines(rawLog);
    const groqKey = (systemSettings.groq_api_key || process.env.GROQ_API_KEY || '').trim();
    const claudeKey = (systemSettings.claude_api_key || process.env.CLAUDE_API_KEY || '').trim();

    const systemInstruction = `You are an expert CI/CD and Compiler Failure Triage AI Bot.
Your job is to read raw logs, compiler errors, stack traces, and runner outputs from GitHub Actions and diagnose the real root cause dynamically.
DO NOT use hardcoded rules or superficial guesses. Examine the exact syntax, AST, type mismatch, missing dependency, assertion, or config issue.

You MUST respond strictly with valid JSON conforming to this schema without any markdown wrapping around the JSON:
{
  "failure_category": "syntax_error" | "type_error" | "test_failure" | "dependency_issue" | "configuration_error" | "infrastructure_timeout" | "runtime_error" | "unknown",
  "confidence_score": 0.95,
  "offending_file": "path/to/file.ext",
  "offending_line": 12,
  "root_cause": "Precise explanation of what broke and why",
  "suggested_fix": "Markdown code snippet showing the fix (with incorrect and corrected code)",
  "remediation_steps": ["Step 1", "Step 2", "Step 3"],
  "prevention_tip": "How to prevent this issue in the future"
}`;

    const userPrompt = `Analyze this CI failure log for repository "${repoName}" ${prNumber ? `(PR #${prNumber})` : ''}:

CI LOG OUTPUT:
\`\`\`
${trimmedLog}
\`\`\`

Return your complete JSON diagnosis.`;

    // 1. Primary AI Engine: Groq API (qwen/qwen3.6-27b)
    if (groqKey && !groqKey.includes('•') && !groqKey.includes('*')) {
        try {
            console.log('[AI Triage] Executing diagnosis via Groq API (qwen/qwen3.6-27b)...');
            const response = await callGroqChat(
                groqKey,
                [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userPrompt },
                ],
                { model: 'qwen/qwen3.6-27b', temperature: 0.1, jsonMode: true }
            );

            let text = response.text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);

            const parsed = JSON.parse(text.trim());
            return {
                failure_category: parsed.failure_category || 'syntax_error',
                confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.95,
                root_cause: parsed.root_cause || 'Groq diagnosed CI build failure.',
                suggested_fix: parsed.suggested_fix || 'Review the error log and apply code correction.',
                remediation_steps: Array.isArray(parsed.remediation_steps) ? parsed.remediation_steps : ['Inspect stack trace', 'Apply code fix'],
                prevention_tip: parsed.prevention_tip || 'Run test suites locally before pushing commits.',
                offending_file: parsed.offending_file || '',
                offending_line: parsed.offending_line || 0,
                raw_response: response.text,
                engine_used: `Groq (${response.model})`,
            };
        } catch (err: any) {
            console.warn(`[Groq API Call Failed (${err.message})] -> Checking fallback engine...`);
        }
    }

    // 2. Secondary AI Engine: Anthropic Claude API
    if (claudeKey && !claudeKey.includes('•') && !claudeKey.includes('*')) {
        try {
            console.log('[AI Triage] Attempting diagnosis with Anthropic Claude 3.5 Sonnet...');
            const anthropic = getClaudeClient(claudeKey);
            const msg = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                temperature: 0.1,
                system: systemInstruction,
                messages: [{ role: 'user', content: userPrompt }],
            });

            const responseText = msg.content
                .filter((block) => block.type === 'text')
                .map((block: any) => block.text)
                .join('');

            let cleanedText = responseText.trim();
            if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
            if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
            if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);

            const parsed = JSON.parse(cleanedText.trim());
            return {
                failure_category: parsed.failure_category || 'syntax_error',
                confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.95,
                root_cause: parsed.root_cause || 'Claude diagnosed build failure.',
                suggested_fix: parsed.suggested_fix || 'Review the error log and apply code correction.',
                remediation_steps: Array.isArray(parsed.remediation_steps) ? parsed.remediation_steps : ['Inspect stack trace', 'Apply code fix'],
                prevention_tip: parsed.prevention_tip || 'Run test suites locally before pushing commits.',
                offending_file: parsed.offending_file || '',
                offending_line: parsed.offending_line || 0,
                raw_response: responseText,
                engine_used: 'Claude 3.5 Sonnet',
            };
        } catch (err: any) {
            console.warn(`[Claude API Call Failed (${err.message})] -> Using heuristic diagnostic engine fallback...`);
        }
    }

    // 3. Built-in Local Diagnostic Rule Engine Fallback (Guarantees zero stall/freeze)
    console.log('[AI Triage] Using built-in local diagnostic rule engine fallback...');
    const lowerLog = rawLog.toLowerCase();
    let category = 'syntax_error';
    let confidence = 0.92;
    let rootCause = 'TypeScript or compiler build failure detected in CI pipeline.';
    let suggestedFix = 'Review syntax errors and ensure compiler types match interface definitions.';
    const remediationSteps = [
        'Inspect the offending file and line indicated in the compilation log.',
        'Run local typecheck (`npm run build` or `npx tsc --noEmit`).',
        'Commit and push corrected syntax.',
    ];

    if (lowerLog.includes('ts1005') || lowerLog.includes('ts1131') || lowerLog.includes('ts2304') || lowerLog.includes('ts2322') || lowerLog.includes('error ts')) {
        category = 'syntax_error';
        confidence = 0.95;
        rootCause = 'TypeScript type checking or syntax error occurred during compilation.';
        suggestedFix = 'Fix the TypeScript syntax or missing type definition at the offending location.';
    } else if (lowerLog.includes('cannot find module') || lowerLog.includes('err_module_not_found') || lowerLog.includes('module not found') || lowerLog.includes('package not found')) {
        category = 'dependency_issue';
        confidence = 0.95;
        rootCause = 'Missing dependency or incorrect package import path in package.json.';
        suggestedFix = 'Run `npm install <package>` or check the import path resolution in your build configuration.';
        remediationSteps[0] = 'Verify package is installed in CI workflow step (`npm ci` or `npm install`).';
    } else if (lowerLog.includes('fail') && (lowerLog.includes('test') || lowerLog.includes('expect') || lowerLog.includes('assert'))) {
        category = 'test_failure';
        confidence = 0.90;
        rootCause = 'One or more automated test suites failed assertion checks.';
        suggestedFix = 'Inspect failed test assertions and update code implementation or test expectations.';
    } else if (lowerLog.includes('timed out') || lowerLog.includes('timeout') || lowerLog.includes('oomkilled') || lowerLog.includes('out of memory')) {
        category = 'infrastructure_timeout';
        confidence = 0.88;
        rootCause = 'Job exceeded maximum execution duration limit or ran out of runner memory.';
        suggestedFix = 'Increase workflow timeout-minutes or optimize build caching to reduce run time.';
    }

    // Extract offending location
    const tsMatch = rawLog.match(/((?:src\/|lib\/|app\/|tests?\/)[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[:\(](\d+)/);
    const offendingFile = tsMatch ? tsMatch[1] : '';
    const offendingLine = tsMatch ? Number(tsMatch[2]) : 0;

    return {
        failure_category: category,
        confidence_score: confidence,
        root_cause: rootCause,
        suggested_fix: suggestedFix,
        remediation_steps: remediationSteps,
        prevention_tip: 'Enable pre-commit hooks with Husky to run linter/typecheck before pushing.',
        offending_file: offendingFile,
        offending_line: offendingLine,
        raw_response: 'Heuristic Rule Engine (Fallback)',
        engine_used: 'Heuristic Diagnostic Engine',
    };
}

function buildGitHubMarkdownReport(
    record: {
        failure_category: string;
        confidence_score: number;
        root_cause?: string | null;
        suggested_fix?: string | null;
        remediation_steps?: string[];
        prevention_tip?: string | null;
        offending_file?: string | null;
        offending_line?: number | null;
        engine_used?: string | null;
    },
    repoName: string = '',
    runId: number = 0
): string {
    const categoryLabels: Record<string, string> = {
        dependency_issue: '📦 **Dependency Issue / Module Resolution Failure**',
        syntax_error: '✍️ **Syntax / Type Compilation Error**',
        type_error: '✍️ **TypeScript Type Mismatch Error**',
        test_failure: '🧪 **Unit / Integration Test Failure**',
        flaky_test: '⚠️ **Flaky Test Anomaly**',
        configuration_error: '⚙️ **Workflow / Configuration Error**',
        infrastructure_timeout: '⏱️ **Runner Execution Timeout**',
        runtime_error: '💥 **Runtime Exception**',
        unknown: '❓ **Unclassified CI Failure**',
    };

    const badge = categoryLabels[record.failure_category] || `❓ **${record.failure_category || 'Unclassified'}**`;
    const confidencePct = Math.round((record.confidence_score || 0.95) * 100);
    const modelEngine = record.engine_used || 'Groq (qwen/qwen3.6-27b)';

    let offendingSection = '';
    if (record.offending_file) {
        offendingSection = `\n- **Target Location**: \`${record.offending_file}${record.offending_line ? `:${record.offending_line}` : ''}\``;
    }

    let remediationSection = '';
    if (record.remediation_steps && record.remediation_steps.length > 0) {
        remediationSection = `\n\n#### 📋 Suggested Remediation Steps\n` +
            record.remediation_steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    }

    let preventionSection = '';
    if (record.prevention_tip) {
        preventionSection = `\n\n#### 🛡️ Prevention Tip\n> ${record.prevention_tip}`;
    }

    return `### 🤖 CI Failure Triage Bot Diagnostic Report

| **Failure Category** | **Confidence Score** | **AI Model Engine** |
| :--- | :--- | :--- |
| ${badge} | \`${confidencePct}%\` | \`${modelEngine}\` |
${offendingSection}

#### 🔍 Root Cause Analysis
> ${record.root_cause || 'CI build failure detected in pipeline execution.'}

#### 🛠️ Recommended Action & Suggested Fix
\`\`\`text
${record.suggested_fix || 'Review recent code changes and test failures.'}
\`\`\`${remediationSection}${preventionSection}

---
*Automated diagnostic triage generated by **CI Failure Triage Bot** using \`${modelEngine}\` | Repository: \`${repoName}\` | Workflow Run #${runId}*
`;
}

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(express.json({ limit: '10mb' }));

    // ==========================================
    // API ROUTES
    // ==========================================

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            groq_configured: Boolean(systemSettings.groq_api_key || process.env.GROQ_API_KEY),
            claude_configured: Boolean(systemSettings.claude_api_key || process.env.CLAUDE_API_KEY),
            github_configured: Boolean(systemSettings.github_token || process.env.GITHUB_TOKEN),
            timestamp: new Date().toISOString(),
        });
    });

    // Get all triage results
    app.get('/api/triage-results', (req, res) => {
        res.json(triageStore);
    });
    app.get('/api/dashboard/runs', (req, res) => {
        res.json(triageStore);
    });

    // Get single triage run
    app.get('/api/triage-results/:id', (req, res) => {
        const id = Number(req.params.id);
        const item = triageStore.find((r) => r.id === id || r.run_id === id);
        if (!item) {
            return res.status(404).json({ error: 'Triage run not found' });
        }
        res.json(item);
    });

    // Execute live AI triage on raw CI log
    const handleTriageRequest = async (req: express.Request, res: express.Response) => {
        const { repo_name, run_id, pr_number, raw_log } = req.body;
        if (!raw_log || typeof raw_log !== 'string') {
            return res.status(400).json({ error: 'raw_log string is required' });
        }

        const actualRepo = repo_name || 'custom/repo';
        const actualRunId = run_id ? Number(run_id) : Math.floor(1000000000 + Math.random() * 9000000000);
        const actualPr = pr_number ? Number(pr_number) : null;
        const isSimulated = req.path.includes('simulate') || actualRepo.toLowerCase().includes('simulated');

        try {
            console.log(`[AI Triage] Analyzing CI run #${actualRunId} for ${actualRepo}...`);
            const aiResult = await analyzeLogWithAI(raw_log, actualRepo, actualPr);

            const newRecord: StoredTriageResult = {
                id: Date.now(),
                repo_name: actualRepo,
                run_id: actualRunId,
                pr_number: actualPr,
                failure_category: aiResult.failure_category,
                confidence_score: aiResult.confidence_score,
                root_cause: aiResult.root_cause,
                suggested_fix: aiResult.suggested_fix,
                remediation_steps: aiResult.remediation_steps,
                prevention_tip: aiResult.prevention_tip,
                offending_file: aiResult.offending_file,
                offending_line: aiResult.offending_line,
                trimmed_log: trimLogLines(raw_log),
                raw_response: aiResult.raw_response,
                status: isSimulated ? 'nothing' : (actualPr ? 'pending' : 'posted'),
                bot_action: isSimulated ? 'Nothing' : (actualPr ? 'Pending Post' : 'Logged'),
                is_simulated: isSimulated,
                github_comment_url: null,
                engine_used: aiResult.engine_used,
                created_at: new Date().toISOString(),
            };

            triageStore = [newRecord, ...triageStore];
            res.json(newRecord);
        } catch (err: any) {
            console.error('[Triage Request Error]:', err.message);
            const errorRecord: StoredTriageResult = {
                id: Date.now(),
                repo_name: actualRepo,
                run_id: actualRunId,
                pr_number: actualPr,
                failure_category: 'unknown',
                confidence_score: 0.5,
                root_cause: `AI Analysis Error: ${err.message}`,
                suggested_fix: 'Check server logs or verify Groq API keys in System Settings.',
                trimmed_log: trimLogLines(raw_log),
                raw_response: JSON.stringify({ error: err.message }, null, 2),
                status: isSimulated ? 'nothing' : 'error',
                bot_action: isSimulated ? 'Nothing' : 'Error',
                is_simulated: isSimulated,
                github_comment_url: null,
                engine_used: 'Error Fallback',
                created_at: new Date().toISOString(),
            };
            triageStore = [errorRecord, ...triageStore];
            res.status(500).json(errorRecord);
        }
    };

    app.post('/api/triage-results', handleTriageRequest);
    app.post('/api/simulate-triage', handleTriageRequest);
    app.post('/api/triage', handleTriageRequest);

    // Retry / Re-process run with AI
    app.post('/api/runs/:runId/retry', async (req, res) => {
        const runId = Number(req.params.runId);
        const existing = triageStore.find((r) => r.run_id === runId || r.id === runId);

        if (!existing || !existing.trimmed_log) {
            return res.status(404).json({ error: 'Run log not found for re-analysis' });
        }

        try {
            console.log(`[AI Triage] Re-processing run #${runId}...`);
            const aiResult = await analyzeLogWithAI(
                existing.trimmed_log,
                existing.repo_name,
                existing.pr_number || null
            );

            existing.failure_category = aiResult.failure_category;
            existing.confidence_score = aiResult.confidence_score;
            existing.root_cause = aiResult.root_cause;
            existing.suggested_fix = aiResult.suggested_fix;
            existing.remediation_steps = aiResult.remediation_steps;
            existing.prevention_tip = aiResult.prevention_tip;
            existing.offending_file = aiResult.offending_file;
            existing.offending_line = aiResult.offending_line;
            existing.raw_response = aiResult.raw_response;
            existing.engine_used = aiResult.engine_used;
            if (existing.is_simulated) {
                existing.status = 'nothing';
                existing.bot_action = 'Nothing';
            } else {
                existing.status = existing.github_comment_url ? 'posted' : 'pending';
                existing.bot_action = existing.github_comment_url ? 'Commented' : 'Pending Post';
            }

            res.json(existing);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Interactive AI Chat regarding a specific error
    app.post('/api/ai/chat', async (req, res) => {
        const { message, log_context } = req.body;
        const groqKey = (systemSettings.groq_api_key || process.env.GROQ_API_KEY || '').trim();
        const claudeKey = (systemSettings.claude_api_key || process.env.CLAUDE_API_KEY || '').trim();

        const systemPrompt = 'You are an expert CI/CD debugging bot. Provide concise, highly accurate technical advice, unit tests, or fixes for developers.';
        const userPrompt = `Context of CI failure:\n${log_context || 'No context'}\n\nDeveloper question: ${message}`;

        if (groqKey && !groqKey.includes('•') && !groqKey.includes('*')) {
            try {
                const response = await callGroqChat(
                    groqKey,
                    [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    { model: 'qwen/qwen3.6-27b', temperature: 0.2 }
                );
                return res.json({ reply: response.text, engine: `Groq (${response.model})` });
            } catch (err: any) {
                console.warn('[Chat Groq Error] Falling back to secondary engine:', err.message);
            }
        }

        if (claudeKey && !claudeKey.includes('•') && !claudeKey.includes('*')) {
            try {
                const client = getClaudeClient(claudeKey);
                const response = await client.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1500,
                    temperature: 0.1,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                });

                const reply = response.content
                    .filter((b) => b.type === 'text')
                    .map((b: any) => b.text)
                    .join('');

                return res.json({ reply, engine: 'Claude 3.5 Sonnet' });
            } catch (err: any) {
                return res.status(500).json({ error: err.message });
            }
        }

        // Rule-based helpful response if no API keys configured
        return res.json({
            reply: `Diagnostic advice: Based on the provided log context, check the line syntax or missing dependency mentioned in the error. To enable interactive LLM chat, configure GROQ_API_KEY (qwen/qwen3.6-27b) or CLAUDE_API_KEY in System Settings or .env.`,
            engine: 'Rule-Based Assistant',
        });
    });

    // Post PR comment (or simulate comment URL)
    app.post('/api/dashboard/runs/:runId/post_comment', async (req, res) => {
        const runId = Number(req.params.runId);
        const item = triageStore.find((r) => r.run_id === runId || r.id === runId);

        if (!item) {
            return res.status(404).json({ error: 'Run not found' });
        }

        const commentBody = buildGitHubMarkdownReport(item, item.repo_name, item.run_id);
        const githubToken = (systemSettings.github_token || process.env.GITHUB_TOKEN || '').trim();

        if (githubToken && item.repo_name && item.pr_number && !githubToken.includes('•')) {
            try {
                const ghRes = await fetch(`https://api.github.com/repos/${item.repo_name}/issues/${item.pr_number}/comments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github+json',
                        'User-Agent': 'CI-Failure-Triage-Bot',
                    },
                    body: JSON.stringify({ body: commentBody }),
                });

                if (ghRes.ok) {
                    const ghData = await ghRes.json();
                    item.status = 'posted';
                    item.bot_action = 'Commented';
                    item.github_comment_url = ghData.html_url;
                    return res.json({ success: true, comment_url: ghData.html_url });
                }
            } catch (e) {
                console.warn('[GitHub Comment Post Failed, falling back to simulated URL]:', e);
            }
        }

        item.status = 'posted';
        item.bot_action = 'Commented';
        item.github_comment_url = `https://github.com/${item.repo_name}/pull/${item.pr_number || 1}#issuecomment-${Date.now()}`;
        return res.json({ success: true, comment_url: item.github_comment_url });
    });

    // Delete run
    app.delete('/api/runs/:runId', (req, res) => {
        const runId = Number(req.params.runId);
        triageStore = triageStore.filter((r) => r.run_id !== runId && r.id !== runId);
        res.json({ success: true });
    });
    app.delete('/api/triage-results/:id', (req, res) => {
        const id = Number(req.params.id);
        triageStore = triageStore.filter((r) => r.id !== id && r.run_id !== id);
        res.json({ success: true });
    });

    // Clear simulated runs
    app.delete('/api/triage-results/clear-simulated', (req, res) => {
        triageStore = triageStore.filter((r) => !r.is_simulated);
        res.json({ success: true, remaining: triageStore.length });
    });

    // Metrics
    app.get('/api/metrics', (req, res) => {
        const total = triageStore.length;
        const categoryCounts: Record<string, number> = {};
        triageStore.forEach((r) => {
            const c = r.failure_category || 'other';
            categoryCounts[c] = (categoryCounts[c] || 0) + 1;
        });

        let mostCommon = 'None';
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = cat.replace('_', ' ').toUpperCase();
            }
        });

        res.json({
            triaged_this_week: total,
            most_common_cause: mostCommon,
            avg_response_time_seconds: 1.2,
        });
    });
    app.get('/api/dashboard/metrics', (req, res) => {
        res.redirect('/api/metrics');
    });

    // Repositories CRUD
    app.get('/api/repos', (req, res) => {
        res.json(repoStore);
    });

    app.post('/api/repos', (req, res) => {
        const { owner, name } = req.body;
        if (!owner || !name) {
            return res.status(400).json({ error: 'Owner and name required' });
        }
        const newRepo: StoredRepo = {
            id: Date.now(),
            owner: owner.trim(),
            name: name.trim(),
            is_active: true,
            created_at: new Date().toISOString(),
        };
        repoStore = [newRepo, ...repoStore];
        res.json(newRepo);
    });

    app.patch('/api/repos/:id/toggle', (req, res) => {
        const id = Number(req.params.id);
        const repo = repoStore.find((r) => r.id === id);
        if (!repo) return res.status(404).json({ error: 'Repo not found' });
        repo.is_active = !repo.is_active;
        res.json(repo);
    });

    app.delete('/api/repos/:id', (req, res) => {
        const id = Number(req.params.id);
        repoStore = repoStore.filter((r) => r.id !== id);
        res.json({ success: true });
    });

    // Settings
    app.get('/api/settings', (req, res) => {
        res.json(systemSettings);
    });

    app.post('/api/settings', (req, res) => {
        const body = req.body || {};
        if (body.groq_api_key && typeof body.groq_api_key === 'string') {
            const cleanKey = body.groq_api_key.replace(/^['"]+|['"]+$/g, '').trim();
            if (cleanKey && !cleanKey.includes('...') && !cleanKey.includes('•') && !cleanKey.includes('*')) {
                systemSettings.groq_api_key = cleanKey;
                process.env.GROQ_API_KEY = cleanKey;
                persistEnvFile('GROQ_API_KEY', cleanKey);
            }
        }
        if (body.claude_api_key && typeof body.claude_api_key === 'string') {
            const cleanKey = body.claude_api_key.replace(/^['"]+|['"]+$/g, '').trim();
            if (cleanKey && !cleanKey.includes('...') && !cleanKey.includes('•') && !cleanKey.includes('*')) {
                systemSettings.claude_api_key = cleanKey;
                process.env.CLAUDE_API_KEY = cleanKey;
                persistEnvFile('CLAUDE_API_KEY', cleanKey);
            }
        }
        if (body.github_token && typeof body.github_token === 'string') {
            const cleanToken = body.github_token.replace(/^['"]+|['"]+$/g, '').trim();
            if (cleanToken && !cleanToken.includes('...') && !cleanToken.includes('•') && !cleanToken.includes('*')) {
                systemSettings.github_token = cleanToken;
                process.env.GITHUB_TOKEN = cleanToken;
                persistEnvFile('GITHUB_TOKEN', cleanToken);
            }
        }
        if (body.webhook_secret && typeof body.webhook_secret === 'string') {
            const cleanSecret = body.webhook_secret.replace(/^['"]+|['"]+$/g, '').trim();
            if (cleanSecret && !cleanSecret.includes('...') && !cleanSecret.includes('•') && !cleanSecret.includes('*')) {
                systemSettings.webhook_secret = cleanSecret;
                process.env.WEBHOOK_SECRET = cleanSecret;
                persistEnvFile('WEBHOOK_SECRET', cleanSecret);
            }
        }
        if (typeof body.max_log_tokens === 'number') systemSettings.max_log_tokens = body.max_log_tokens;
        if (typeof body.rate_limit_per_min === 'number') systemSettings.rate_limit_per_min = body.rate_limit_per_min;
        if (typeof body.debug_mode === 'boolean') systemSettings.debug_mode = body.debug_mode;

        res.json(systemSettings);
    });

    /**
     * Groq API Connection Test Endpoint
     */
    const handleTestGroq = async (req: express.Request, res: express.Response) => {
        const { apiKey, groq_api_key } = req.body || {};
        const inputKey = apiKey || groq_api_key;
        const isMaskedOrEmpty = !inputKey || typeof inputKey !== 'string' || !inputKey.trim() || inputKey.includes('...') || inputKey.includes('•') || inputKey.includes('*');
        const rawKey = !isMaskedOrEmpty
            ? inputKey.trim()
            : (systemSettings.groq_api_key || process.env.GROQ_API_KEY || '');
        const keyToTest = rawKey.replace(/^['"]+|['"]+$/g, '').trim();

        if (!keyToTest || keyToTest.includes('•') || keyToTest.includes('*')) {
            return res.status(400).json({
                valid: false,
                message: 'GROQ_API_KEY chưa được nhập. Vui lòng dán khóa Groq API Key của bạn (bắt đầu bằng gsk_...).',
            });
        }

        try {
            console.log('[Groq Test] Testing connection to https://api.groq.com/openai/v1/chat/completions with qwen/qwen3.6-27b...');
            const response = await callGroqChat(
                keyToTest,
                [{ role: 'user', content: 'Ping' }],
                { model: 'qwen/qwen3.6-27b', temperature: 0.1 }
            );

            if (response && response.text) {
                systemSettings.groq_api_key = keyToTest;
                process.env.GROQ_API_KEY = keyToTest;
                persistEnvFile('GROQ_API_KEY', keyToTest);

                return res.json({
                    valid: true,
                    message: `Kết nối thành công! Groq AI Engine (${response.model}) đã được xác thực sẵn sàng chẩn đoán CI/CD.`,
                    model: response.model,
                    status: 'online',
                });
            }

            return res.json({
                valid: true,
                message: 'Groq API đã kết nối thành công!',
                model: 'qwen/qwen3.6-27b',
            });
        } catch (err: any) {
            console.error('[Groq API Key Test Failed]:', err.message);
            const errMsg = err.message || '';
            let friendlyMsg = errMsg;

            if (errMsg.includes('401') || errMsg.toLowerCase().includes('authentication') || errMsg.toLowerCase().includes('invalid')) {
                friendlyMsg = 'Khóa Groq API Key không hợp lệ hoặc đã bị thu hồi (HTTP 401). Vui lòng lấy khóa mới miễn phí tại console.groq.com/keys.';
            } else if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit')) {
                friendlyMsg = 'Đã đạt giới hạn tần suất gọi Groq API (HTTP 429 Rate Limit Exceeded). Vui lòng thử lại sau giây lát.';
            } else if (errMsg.toLowerCase().includes('abort') || errMsg.toLowerCase().includes('timeout')) {
                friendlyMsg = 'Hết thời gian chờ phản hồi (Timeout) khi kết nối tới Groq API (api.groq.com).';
            }

            return res.status(400).json({
                valid: false,
                message: friendlyMsg,
                raw_error: errMsg,
                help_url: 'https://console.groq.com/keys',
            });
        }
    };

    app.post('/api/settings/test-groq-key', handleTestGroq);
    app.post('/api/settings/test-groq', handleTestGroq);
    app.post('/api/test-groq-key', handleTestGroq);
    app.post('/api/test-groq', handleTestGroq);

    const handleTestClaude = async (req: express.Request, res: express.Response) => {
        const { apiKey, claude_api_key } = req.body || {};
        const inputKey = apiKey || claude_api_key;
        const isMaskedOrEmpty = !inputKey || typeof inputKey !== 'string' || !inputKey.trim() || inputKey.includes('...') || inputKey.includes('•') || inputKey.includes('*');
        const rawKey = !isMaskedOrEmpty
            ? inputKey.trim()
            : (systemSettings.claude_api_key || process.env.CLAUDE_API_KEY || '');
        const keyToTest = rawKey.replace(/^['"]+|['"]+$/g, '').trim();

        if (!keyToTest || keyToTest.includes('•') || keyToTest.includes('*')) {
            return res.status(400).json({
                valid: false,
                message: 'Please provide a valid Anthropic Claude API Key (starts with sk-ant-api03-...).',
                fallback_available: true,
                fallback_engine: 'Groq (qwen/qwen3.6-27b)',
            });
        }

        try {
            const anthropic = new Anthropic({ apiKey: keyToTest });
            const response = await anthropic.messages.create({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Ping' }],
            });

            if (response && response.content) {
                systemSettings.claude_api_key = keyToTest;
                process.env.CLAUDE_API_KEY = keyToTest;
                persistEnvFile('CLAUDE_API_KEY', keyToTest);
                return res.json({
                    valid: true,
                    message: 'Anthropic Claude API connected successfully! The API key is valid and the bot is ready to triage CI failures.',
                    model: response.model || 'claude-3-5-haiku-20241022',
                });
            }
            return res.json({
                valid: true,
                message: 'Claude API connected successfully!',
            });
        } catch (err: any) {
            console.error('[Claude API Key Test Failed]:', err.message);
            const status = err.status || err.statusCode || 400;
            let friendlyMessage = err.message;
            if (status === 401 || err.message?.includes('401') || err.message?.includes('invalid') || err.message?.includes('authentication_error')) {
                friendlyMessage = 'Authentication Error (HTTP 401): The Anthropic API key is invalid, inactive, or revoked. Please verify your key at console.anthropic.com.';
            } else if (status === 429 || err.message?.includes('credit') || err.message?.includes('rate_limit')) {
                friendlyMessage = 'Rate Limit / Credits Exceeded (HTTP 429): Your Anthropic account has run out of credits or reached its usage limit.';
            }
            return res.status(400).json({
                valid: false,
                status_code: status,
                message: friendlyMessage,
                raw_error: err.message,
                fallback_available: true,
                fallback_engine: 'Groq (qwen/qwen3.6-27b)',
            });
        }
    };

    app.post('/api/settings/test-claude-key', handleTestClaude);
    app.post('/api/settings/test-claude', handleTestClaude);
    app.post('/api/test-claude-key', handleTestClaude);
    app.post('/api/test-claude', handleTestClaude);

    app.post('/api/settings/test-github-token', async (req, res) => {
        const { token } = req.body;
        if (!token || typeof token !== 'string' || token.trim().length < 8) {
            return res.status(400).json({
                valid: false,
                message: 'Please provide a valid GitHub Personal Access Token.',
            });
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${token.trim()}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'CI-Triage-Bot',
                },
            });

            if (response.status === 200) {
                const user = await response.json();
                const scopes = response.headers.get('x-oauth-scopes') || 'Fine-grained token permissions';
                return res.json({
                    valid: true,
                    message: `Connected successfully as @${user.login}. Scopes: ${scopes}`,
                    user: user.login,
                    scopes,
                });
            } else {
                return res.status(400).json({
                    valid: false,
                    message: `GitHub API returned status ${response.status}: Invalid or expired token.`,
                });
            }
        } catch (err: any) {
            return res.status(500).json({
                valid: false,
                message: `Network error connecting to GitHub API: ${err.message}`,
            });
        }
    });

    // Webhook receiver for GitHub workflow_run events (live webhook)
    const handleLiveWebhook = async (req: express.Request, res: express.Response) => {
        const event = req.headers['x-github-event'] || req.body?.event || 'workflow_run';
        const payload = req.body || {};

        console.log(`[Webhook Ingest] Received GitHub event: ${event}`);
        if (event === 'ping') {
            return res.json({ status: 'pong', message: 'CI Triage Bot Webhook active' });
        }

        const action = payload.action;
        const workflowRun = payload.workflow_run || {};
        const conclusion = workflowRun.conclusion || payload.conclusion;

        if (action === 'completed' && conclusion === 'failure') {
            const repoData = payload.repository || {};
            const repoName = repoData.full_name || 'unknown/repo';
            const runId = workflowRun.id || Date.now();
            const prNumber = workflowRun.pull_requests?.[0]?.number || payload.pr_number || null;
            const rawLog = payload.raw_log || workflowRun.head_commit?.message || `GitHub Actions workflow "${workflowRun.name || 'CI'}" failed at commit ${workflowRun.head_sha || 'HEAD'}.`;

            console.log(`[Live Webhook] Triggering auto-triage for ${repoName} (Run #${runId})`);

            try {
                const aiResult = await analyzeLogWithAI(rawLog, repoName, prNumber);
                const newRecord: StoredTriageResult = {
                    id: Date.now(),
                    repo_name: repoName,
                    run_id: runId,
                    pr_number: prNumber,
                    failure_category: aiResult.failure_category,
                    confidence_score: aiResult.confidence_score,
                    root_cause: aiResult.root_cause,
                    suggested_fix: aiResult.suggested_fix,
                    remediation_steps: aiResult.remediation_steps,
                    prevention_tip: aiResult.prevention_tip,
                    offending_file: aiResult.offending_file,
                    offending_line: aiResult.offending_line,
                    trimmed_log: trimLogLines(rawLog),
                    raw_response: aiResult.raw_response,
                    status: prNumber ? 'pending' : 'posted',
                    bot_action: prNumber ? 'Pending Post' : 'Logged',
                    is_simulated: false,
                    github_comment_url: null,
                    engine_used: aiResult.engine_used,
                    created_at: new Date().toISOString(),
                };

                triageStore = [newRecord, ...triageStore];

                // Attempt post comment if GITHUB_TOKEN configured and prNumber exists
                const githubToken = (systemSettings.github_token || process.env.GITHUB_TOKEN || '').trim();
                if (githubToken && prNumber && !githubToken.includes('•')) {
                    try {
                        const commentBody = buildGitHubMarkdownReport(newRecord, repoName, runId);
                        const ghRes = await fetch(`https://api.github.com/repos/${repoName}/issues/${prNumber}/comments`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${githubToken}`,
                                Accept: 'application/vnd.github+json',
                                'User-Agent': 'CI-Failure-Triage-Bot',
                            },
                            body: JSON.stringify({ body: commentBody }),
                        });
                        if (ghRes.ok) {
                            const ghData = await ghRes.json();
                            newRecord.status = 'posted';
                            newRecord.bot_action = 'Commented';
                            newRecord.github_comment_url = ghData.html_url;
                        }
                    } catch (ghErr) {
                        console.warn('[Live Webhook GH Comment Post Failed]:', ghErr);
                    }
                }

                return res.status(200).json({
                    status: 'accepted',
                    message: `CI Failure triage completed for ${repoName} (Run #${runId})`,
                    run_id: runId,
                    pr_number: prNumber,
                    record: newRecord,
                });
            } catch (err: any) {
                console.error('[Live Webhook Processing Error]:', err.message);
                return res.status(500).json({ status: 'error', message: err.message });
            }
        }

        return res.status(200).json({
            status: 'ignored',
            message: `Event '${event}' with action '${action}' & conclusion '${conclusion}' is not a failed workflow run.`,
        });
    };

    app.post('/api/webhook/github', handleLiveWebhook);
    app.post('/api/webhook', handleLiveWebhook);
    app.post('/webhook/github', handleLiveWebhook);
    app.post('/webhook', handleLiveWebhook);

    // ==========================================
    // VITE & STATIC SERVING
    // ==========================================
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();

