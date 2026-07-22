export const CLAUDE_FIXTURE_PATH = "/fixtures/claude-project/fixture-claude-001.jsonl";
export const CODEX_FIXTURE_PATH =
  "/fixtures/.codex/sessions/2026/02/05/rollout-019c21af-23f2-7401-af13-9582c5881d39.jsonl";
export const CODEX_STRUCTURED_FIXTURE_PATH =
  "/fixtures/.codex/sessions/2026/02/06/rollout-structured-facets.jsonl";

export const CLAUDE_FIXTURE = `{"type":"summary","summary":"Summarize the session so far"}
{"type":"user","cwd":"/tmp/rawr-fixture-claude","gitBranch":"main","sessionId":"fixture-claude-001","timestamp":"2026-02-05T00:00:00.000Z","message":{"model":"claude-3-5-sonnet","content":[{"type":"input_text","text":"Hello from the fixture"}]}}
{"type":"assistant","timestamp":"2026-02-05T00:00:01.000Z","message":{"model":"claude-3-5-sonnet","content":[{"type":"text","text":"Hi! This is a fixture response."}]}}
`;

export const CODEX_FIXTURE = `{"type":"session_meta","timestamp":"2026-02-05T00:00:00.000Z","payload":{"id":"019c21af-23f2-7401-af13-9582c5881d39","cwd":"/tmp/rawr-fixture-codex","timestamp":"2026-02-05T00:00:00.000Z","git":{"branch":"codex/feat-sessions-plugin"},"model":"gpt-5.2","model_provider":"openai","info":{"model_context_window":128000}}}
{"type":"response_item","timestamp":"2026-02-05T00:00:01.000Z","payload":{"type":"message","role":"user","content":"Find sessions mentioning oclif."}}
{"type":"response_item","timestamp":"2026-02-05T00:00:02.000Z","payload":{"type":"message","role":"assistant","content":"Searching for oclif references now."}}
`;

export const CODEX_STRUCTURED_FIXTURE = `{"type":"session_meta","timestamp":"2026-02-06T00:00:00.000Z","payload":{"id":"structured-facets","cwd":"/tmp/rawr-fixture-codex","timestamp":"2026-02-06T00:00:00.000Z","git":{"branch":"codex/session-facets"},"model":"gpt-5.2","model_provider":"openai","info":{"model_context_window":128000}}}
{"type":"response_item","timestamp":"2026-02-06T00:00:01.000Z","payload":{"type":"message","role":"developer","content":"<proposed_plan>\\nDo the structured parity thing.\\n</proposed_plan>\\n\\n<environment_context>\\n::hidden-directive{title=\\"hidden\\" body=\\"do not facet\\"}\\n</environment_context>\\n\\n<permissions_instructions>\\nOnly do safe actions.\\n</permissions_instructions>\\n\\n::code-comment{title=\\"[P1] Example\\" body=\\"demo\\" file=\\"/tmp/x.ts\\" start=1}\\n"}}
{"type":"event_msg","timestamp":"2026-02-06T00:00:01.500Z","payload":{"type":"user_message","message":"structured parity content needle"}}
{"type":"response_item","timestamp":"2026-02-06T00:00:02.000Z","payload":{"type":"function_call","name":"exec_command","call_id":"call_abc","arguments":"{\\"cmd\\":\\"echo hi\\"}"}}
{"type":"response_item","timestamp":"2026-02-06T00:00:03.000Z","payload":{"type":"custom_tool_call","name":"apply_patch","call_id":"call_def","input":"*** Begin Patch\\n*** End Patch\\n"}}
{"type":"response_item","timestamp":"2026-02-06T00:00:04.000Z","payload":{"type":"custom_tool_call_output","call_id":"call_def","output":"{\\"output\\":\\"ok\\"}"}}
{"type":"event_msg","timestamp":"2026-02-06T00:00:05.000Z","payload":{"type":"agent_message","message":"::automation-update{mode=\\"view\\" id=\\"123\\"}"}}
{"type":"event_msg","timestamp":"2026-02-06T00:00:06.000Z","payload":{"type":"agent_reasoning","text":"<environment_context>\\n  <cwd>/tmp</cwd>\\n</environment_context>"}}
`;
