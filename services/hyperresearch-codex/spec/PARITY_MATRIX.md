# Parity Matrix

Statuses:

- `native`: Codex has an observed equivalent runtime feature in the target environment.
- `mapped`: adapter can translate the construct without changing the contract materially.
- `guarded-workaround`: no exact equivalent; runner must enforce the invariant.
- `unsupported-explicit`: do not claim parity; fail or defer with evidence.

| Claude / Hyperresearch construct | Codex decision | Status | Required guard or proof |
|---|---|---:|---|
| Entry skill `hyperresearch.md` | Codex skill entrypoint synced from RAWR HQ | mapped | Skill must call/load template runner docs and not rely on chat memory |
| Sixteen V8 step skills | File-backed step references loaded fresh before each step | guarded-workaround | Ledger records path, SHA-256, and load timestamp for every step |
| Nested `Skill(skill: "...")` calls | Explicit step loader until callable nested skill semantics are proven | guarded-workaround | Fixture required before using nested skills as runtime mechanism |
| `Task` subagent spawn | Codex `spawn_agent` packets or custom TOML agents | mapped | Parent packet includes query, pipeline position, input artifacts, output path/schema |
| Agent Markdown frontmatter | Codex custom agent TOML where constraints matter | mapped | Keep source frontmatter to Codex-safe fields; avoid Claude-only `model`, `tools`, and `color` unless the adapter disposition is explicit |
| Claude model/tool locks | Codex permissions where available plus runner gates | guarded-workaround | Snapshot draft, reject large unlogged rewrites, require patch logs and lint |
| `TodoWrite` pipeline tracking | Durable JSON run ledger | mapped | Ledger survives compaction and records current step, failures, and resumes |
| Claude `PreToolUse` vault hook | Optional Codex hooks after feature flag proof | guarded-workaround | Hooks are reminders/blocks, not acceptance proof |
| Hyperresearch CLI backend | Direct `hyperresearch`/`hpr` CLI calls | native | Runner allowlists operations and records stdout/stderr/exit code |
| `hyperresearch research` command | Not used for parity | unsupported-explicit | Command is a one-shot research tool, not the 16-step Claude harness |
| Hyperresearch MCP read tools | Optional after `hyperresearch[mcp]` validation | guarded-workaround | Tool list and read behavior must be observed before marking native |
| Hyperresearch MCP write tools | Optional, explicitly allowed only when needed | guarded-workaround | Write allowlist and audit trail required |
| Vault notes/sources | Hyperresearch backend remains authority | native | Material claims trace to notes/source metadata |
| Lint/export gates | Hyperresearch CLI plus runner integrity validation | mapped | Blocking findings prevent success |
| Patch-only final correction | Patcher role plus deterministic patch guard | guarded-workaround | Patch log and rewrite-size checks required |

## Current Evidence Snapshot

- Local `hyperresearch --version` reports `0.8.5`.
- Installed package exposes 16 step markdown files under `hyperresearch/skills`.
- Installed package exposes Claude install logic in `hyperresearch/core/hooks.py`.
- Installed MCP server exposes read and write-capable functions in `hyperresearch/mcp/server.py`.
- RAWR compatibility matrix says Codex skills are native, Codex custom agents require adapter projection, hooks require fixture proof, and official plugin packaging remains distinct from direct local mirrors.

Refresh before final acceptance.
