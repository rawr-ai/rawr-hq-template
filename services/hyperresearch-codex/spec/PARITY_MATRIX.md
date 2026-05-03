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
| `Task` subagent spawn | Codex `spawn_agent` packets or custom TOML agents | mapped | Parent packet includes query, pipeline position, input artifacts, role-assigned required artifacts, full step artifact context, output path/schema, and artifact commitments with hashes |
| Agent Markdown frontmatter | Codex custom agent TOML where constraints matter | mapped | Keep source frontmatter to Codex-safe fields; avoid Claude-only `model`, `tools`, and `color` unless the adapter disposition is explicit |
| Claude model/tool locks | Codex permissions where available plus runner gates | guarded-workaround | Snapshot draft, reject large/unlogged rewrites, require accepted patch logs with before/after hashes and changed-line hunk coverage, then lint |
| `TodoWrite` pipeline tracking | Durable JSON run ledger | mapped | Ledger survives compaction and records current step, failures, and resumes |
| Claude `PreToolUse` vault hook | Optional Codex hooks after feature flag proof | guarded-workaround | Hooks are reminders/blocks, not acceptance proof |
| Hyperresearch CLI backend | Direct `hyperresearch`/`hpr` CLI calls | native | Runner allowlists operations and records stdout/stderr/exit code |
| `hyperresearch research` command | Not used for parity | unsupported-explicit | Command is a one-shot research tool, not the 16-step Claude harness |
| Hyperresearch MCP read tools | Optional after `hyperresearch[mcp]` validation | guarded-workaround | Tool list and read behavior must be observed before marking native |
| Hyperresearch MCP write tools | Optional, explicitly allowed only when needed | guarded-workaround | Write allowlist and audit trail required |
| Vault notes/sources | Hyperresearch backend remains authority | native | Source captures are ledgered with suggested-by provenance; material claims trace to captured sources or explicit uncertainty |
| Lint/export gates | Hyperresearch CLI plus runner integrity validation | mapped | Blocking findings prevent success |
| Patch-only final correction | Patcher role plus deterministic patch guard | guarded-workaround | Patch log and rewrite-size checks required |

## Current Evidence Snapshot

- Local `hyperresearch --version` reports `0.8.5`.
- Installed package exposes 16 step markdown files under `hyperresearch/skills`.
- Installed package exposes Claude install logic in `hyperresearch/core/hooks.py`.
- Installed MCP server exposes read and write-capable functions in `hyperresearch/mcp/server.py`.
- RAWR compatibility matrix says Codex skills are native, Codex custom agents require adapter projection, hooks require fixture proof, and official plugin packaging remains distinct from direct local mirrors.

Refresh before final acceptance.

## V8 Step Adapter Matrix

The service state machine owns step loading, route order, durable ledger state, artifact gates, and deterministic fixture outputs. The Codex skill/coordinator owns real subagent fan-out/fan-in. Fixture mode may synthesize role outputs, but it must still write the same packet/result paths that the real Codex skill loop uses.

| # | Hyperresearch step | Tier | Codex execution decision | Required artifacts / gates |
|---:|---|---|---|---|
| 1 | `hyperresearch-1-decompose` | all | service step load + scaffold and deterministic query decomposition; real run follows loaded procedure | `research/scaffold.md`, structured `research/prompt-decomposition.json`, `research/temp/coverage-matrix.md`; tier and proof boundaries must be recorded |
| 2 | `hyperresearch-2-width-sweep` | all | agent packets for fetcher/source analyst with assigned artifact sets; CLI source capture only through allowed backend ops | packet outputs must collectively declare required artifact writes; source captures record URL, CLI call indexes, evidence, and suggested-by jobs without refetching already captured URLs |
| 3 | `hyperresearch-3-contradiction-graph` | full | service artifact step from captured corpus | `research/temp/contradiction-graph.json`, `research/temp/consensus-claims.json` |
| 4 | `hyperresearch-4-loci-analysis` | full | two loci-analyst packets in one wave | `research/loci.json`; no fake breadcrumb role names |
| 5 | `hyperresearch-5-depth-investigation` | full | depth-investigator packets, fixture capped to two loci | interim/depth log artifacts with committed positions |
| 6 | `hyperresearch-6-cross-locus-reconcile` | full | service artifact step from interim outputs | `research/comparisons.md` |
| 7 | `hyperresearch-7-source-tensions` | full | service artifact step | `research/temp/source-tensions.json` |
| 8 | `hyperresearch-8-corpus-critic` | full | corpus-critic packet plus targeted fetcher packet | `research/corpus-critic-gaps.json`, `research/temp/corpus-critic-results.md` |
| 9 | `hyperresearch-9-evidence-digest` | full | service digest artifact step | `research/temp/evidence-digest.md` |
| 10 | `hyperresearch-10-triple-draft` | all | light writes single final report; full spawns three draft-orchestrator packets | light: final report snapshot; full: `draft-a/b/c.md` and source lists |
| 11 | `hyperresearch-11-synthesize` | full | synthesizer packet; service snapshots final report after output validation | synthesis plan/outline/pass1 and final report |
| 12 | `hyperresearch-12-critics` | full | four critic packets in one wave | four critic finding JSON files; unresolved blocking findings block acceptance |
| 13 | `hyperresearch-13-gap-fetch` | full | fetcher packet for accepted gap sources | `research/temp/post-critic-fetch-log.md`; provenance chain preserved |
| 14 | `hyperresearch-14-patcher` | full | patcher packet; patch-only guard enforced by service | `research/patch-log.json`; final-report changes after snapshot require an accepted covering patch entry with before/after hashes and changed-line hunk coverage; wholesale rewrites block acceptance |
| 15 | `hyperresearch-15-polish` | all | polish-auditor packet; service runs lint gate | `research/polish-log.json`; final report remains patch-only |
| 16 | `hyperresearch-16-readability-audit` | all | readability-recommender packet; coordinator selectively applies accepted edits | `research/claim-trace.json`, readability recommendations/decisions, final report, sync/lint/export, and final integrity gates pass |

## Role-Agent Adapter Matrix

| Role | Codex decision | Constraint guard |
|---|---|---|
| `hyperresearch-fetcher` | custom agent / packet role | Must return provenance and suggested-by chain; packet output must include relevant `sourceUrls` and artifact writes; source capture uses Hyperresearch CLI |
| `hyperresearch-source-analyst` | custom agent / packet role | Deep-source digest only; no final synthesis; include source URLs when requesting backend fetch provenance |
| `hyperresearch-loci-analyst` | custom agent / packet role | Produces candidate loci and budgets only |
| `hyperresearch-depth-investigator` | custom agent / packet role | Writes committed position output for one locus |
| `hyperresearch-corpus-critic` | custom agent / packet role | Produces overturning-source gaps before drafting |
| `hyperresearch-draft-orchestrator` | custom agent / packet role | Writes only assigned draft/angle output |
| `hyperresearch-synthesizer` | custom agent / packet role | Writes the final report once; no post-synthesis regeneration |
| `hyperresearch-dialectic-critic` | custom agent / packet role | JSON findings only |
| `hyperresearch-depth-critic` | custom agent / packet role | JSON findings only |
| `hyperresearch-width-critic` | custom agent / packet role | JSON findings only |
| `hyperresearch-instruction-critic` | custom agent / packet role | JSON findings only |
| `hyperresearch-patcher` | custom agent / packet role + service guard | Patch log required with critic ID, finding IDs, accepted status, before/after hashes, and hunks covering changed lines; service rejects unlogged or wholesale rewrites |
| `hyperresearch-polish-auditor` | custom agent / packet role + service guard | Polish log required; patch-only guard and claim-trace validation still active |
| `hyperresearch-readability-recommender` | custom agent / packet role | Writes recommendations; coordinator applies decisions |
