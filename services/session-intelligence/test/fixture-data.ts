export const CLAUDE_FIXTURE_PATH = "/fixtures/claude-project/fixture-claude-001.jsonl";
export const CODEX_FIXTURE_PATH = "/fixtures/.codex/sessions/2026/02/05/rollout-019c21af-23f2-7401-af13-9582c5881d39.jsonl";

export const CLAUDE_FIXTURE = `{"type":"summary","summary":"Summarize the session so far"}
{"type":"user","cwd":"/tmp/rawr-fixture-claude","gitBranch":"main","sessionId":"fixture-claude-001","timestamp":"2026-02-05T00:00:00.000Z","message":{"model":"claude-3-5-sonnet","content":[{"type":"input_text","text":"Hello from the fixture"}]}}
{"type":"assistant","timestamp":"2026-02-05T00:00:01.000Z","message":{"model":"claude-3-5-sonnet","content":[{"type":"text","text":"Hi! This is a fixture response."}]}}
`;

export const CODEX_FIXTURE = `{"type":"session_meta","timestamp":"2026-02-05T00:00:00.000Z","payload":{"id":"019c21af-23f2-7401-af13-9582c5881d39","cwd":"/tmp/rawr-fixture-codex","timestamp":"2026-02-05T00:00:00.000Z","git":{"branch":"codex/feat-sessions-plugin"},"model":"gpt-5.2","model_provider":"openai","info":{"model_context_window":128000}}}
{"type":"response_item","timestamp":"2026-02-05T00:00:01.000Z","payload":{"type":"message","role":"user","content":"Find sessions mentioning oclif."}}
{"type":"response_item","timestamp":"2026-02-05T00:00:02.000Z","payload":{"type":"message","role":"assistant","content":"Searching for oclif references now."}}
`;
