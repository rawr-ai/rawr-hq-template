# Review Ledger

## Review Scope

This ledger reviews the current spec and minimal runtime slice before expanding to the full V8 design/implementation loop.

## Findings

| id | severity | status | finding | disposition |
|---|---:|---:|---|---|
| HR-CODEX-001 | blocking | closed | Original plan did not preserve the current split between template-owned service/CLI code and downstream RAWR-owned Codex runtime materials. | Added integration topology to downstream plan and `INTEGRATION_SPEC.md`. |
| HR-CODEX-002 | blocking | closed | A service-only unit test would not prove final Codex plugin-system parity. | Added final plugin-system proof flow and Codex runtime gates. |
| HR-CODEX-003 | blocking | closed | Using `hyperresearch research` could accidentally pass as parity while bypassing the 16-step harness. | Marked `research` unsupported in parity matrix and test plan. |
| HR-CODEX-004 | blocking | closed | First service draft was flat and let the CLI call runner internals directly, violating current service-package topology. | Added `src/service/*`, module contract/router, `createClient`, and moved concrete Node resources into the CLI plugin binding. |
| HR-CODEX-005 | blocking | closed | Initial tests did not call through the service client and would miss package-boundary regressions. | Added service-shape coverage and switched synthetic runtime tests to `createClient(...).fixtures.runSyntheticSlice(...)`. |
| HR-CODEX-006 | blocking | closed | Installed Hyperresearch 0.8.5 CLI argument shapes differ from the first synthetic runner draft. | Updated runner calls to `note new --json <title>` and `export json --json`; tests assert exact argument vectors. |
| HR-CODEX-007 | blocking | closed | Downstream `rawr-hq` still lacked Hyperresearch Codex runtime material for the current agent-sync path. | Added `plugins/agents/hyperresearch` with skill, workflow, role agents, and copied spec references; synced it into Codex. Hook/MCP drafts were demoted to references until real configs exist. |
| HR-CODEX-008 | warning | open | Codex hook and plugin-packaged custom-agent semantics are not yet proven in this environment. | Keep as guarded workaround; require fixture before default enablement. |
| HR-CODEX-009 | warning | closed | Full V8 parity matrix still needs one row per step and role agent before workstream 3 can start. | Closed by the V8 step and role-agent adapter matrix in `PARITY_MATRIX.md`. |
| HR-CODEX-010 | warning | closed | New worktree lacked local `node_modules`, so Nx project discovery could fail there even though package metadata is present. | Ran `bun install`; Nx now discovers both new projects and package-scoped Nx typecheck/test gates pass. |
| HR-CODEX-011 | blocking | closed | The new CLI plugin was built to `dist/commands` but its package metadata pointed oclif at the wrong `dist/plugins/...` path. | Updated `plugins/cli/hyperresearch/package.json` to `oclif.commands=./dist/commands`; `apps/cli` fixture smoke now finds `rawr hyperresearch codex-slice`. |
| HR-CODEX-012 | warning | open | Global `rawr plugins sync drift --agent codex` remains red because of pre-existing workspace plugin drift/residuals outside the Hyperresearch plugin. | Hyperresearch scoped sync is conflict-free and in sync; do not treat global drift as introduced by this slice, but keep it visible before final release gating. |
| HR-CODEX-013 | blocking | closed | Service root exposed runner, ledger, step loader, CLI helper, and integrity internals; service behavior lived in top-level files. | Split callable surfaces into `fixtures` and `runs`, narrowed root exports, kept V8 business internals under `modules/runs/helpers`, kept fixture internals under `modules/fixtures/helpers`, and left only durable entities/resources plus a low-level CLI adapter in `shared`. |
| HR-CODEX-014 | blocking | closed | Blocking integrity findings did not fail the CLI command path. | `rawr hyperresearch codex-slice` now returns `ok:false` and exits nonzero when blocking integrity findings exist; plugin test covers missing-step failure. |
| HR-CODEX-015 | blocking | closed | Draft hook/MCP notes were under runtime sync directories and could be misread as enabled runtime material. | Moved hook/MCP drafts into skill references and require real verified config before placing anything under `hooks/` or `mcp/`. |
| HR-CODEX-016 | warning | closed | Synced-skill invocation inside an actual Codex session had not been run. | Ran `codex exec` in a fresh read-only session against downstream `rawr-hq`; the session discovered `hyperresearch-codex`, read the installed skill, and reported its required first move/current runtime boundary. This proves skill discoverability only, not full V8 execution. |
| HR-CODEX-017 | blocking | closed | V8 implementation can accidentally move orchestration into the oclif plugin instead of the service state machine. | Added V8 state-machine procedures under `services/hyperresearch-codex`; CLI commands remain service-client callers. |
| HR-CODEX-018 | blocking | closed | V8 implementation can silently continue after required CLI failure or resume mismatched ledger inputs. | Required CLI failures block the active step, failed agent outputs block permanently, V8 start rejects mismatched existing ledgers, and tests cover these paths. |
| HR-CODEX-019 | blocking | closed | Current downstream plugin material documented the slice but did not yet drive the start/advance/agent-packet loop. | Updated downstream skill/workflow/references around `rawr hyperresearch codex start`, `advance --agent-mode packets`, `validate`, and `run-fixture`; scoped Codex sync is conflict-free. |
| HR-CODEX-020 | blocking | closed | Procedure input/output schemas can drift into service entities, making core domain concepts depend on transport surface details. | Procedure schemas now live in `contract.ts`; `entities.ts` keeps resolved durable concepts such as ledgers, steps, agent jobs, integrity findings, and CLI calls. |
| HR-CODEX-021 | warning | closed | Router handlers can become same-shape facades over helpers, adding an extra abstraction without service-level orchestration value. | Removed same-shaped runner/v8-runner facades. Procedure routers now own synthetic and V8 business flow directly; module helpers hold subordinate mechanics. |
| HR-CODEX-022 | blocking | closed | Packet-mode runs validated agent output files but completed the step without executing that step's required Hyperresearch CLI operations, so packet fan-in and source-capture audit were proven separately. | Packet-mode resume now validates agent outputs, rejects malformed `sourceUrls`, captures every distinct valid URL through Hyperresearch CLI calls, and blocks on missing source URLs or required CLI failure. Added service tests and passed a real-backend light-route packet smoke with `search/fetch/note/lint/sync/export` in the ledger. |
| HR-CODEX-023 | blocking | closed | A failed topology refactor introduced artificial `runtime`/`common`/`modules/*/services` drift and left service examples/spec laws under-applied. | Reset invalid drift, split only into callable `fixtures` and `runs`, and added structural tests forbidding `runtime`, `common`, module-root implementation files, top-level `shared/helpers`, and module-local `services` directories. |
| HR-CODEX-024 | blocking | closed | Patch-only state recorded snapshot metadata but did not deterministically reject a wholesale final-report rewrite after synthesis. | Snapshot copies now live under `research/temp/report-snapshots/`; validation compares current report content to the snapshot and blocks apparent wholesale rewrites. Added a negative test. |
| HR-CODEX-025 | blocking | closed | Packet-mode agent steps could still complete with service-synthesized artifacts after agent fan-in, leaving real agents unaccountable for substantive V8 outputs. | Packet outputs now declare `artifactWrites` as artifact commitments; packet-mode completion validates required artifacts exist on disk, match declared hashes, and are recorded on the step. Tests cover successful packet artifact fan-in, missing artifact blocking, and packet-mode snapshots for agent-written final reports. |
| HR-CODEX-026 | blocking | closed | Source URL capture was URL-auditable but not claim-grade; the ledger did not preserve suggested-by provenance or require final-report claim trace. | Added durable `sourceCaptures` with URL, CLI call indexes, evidence, and suggested-by job IDs; completed V8 validation requires `research/claim-trace.json`, claim text in the report, confidence, reviewer disposition, and captured source URL/note/source IDs or explicit uncertainty. |
| HR-CODEX-027 | blocking | closed | Patch-only validation blocked wholesale rewrites but did not require a patch log for smaller post-snapshot report edits. | Validation now requires a covering `research/patch-log.json` entry with critic ID, finding IDs, accepted/rejected status, before/after hashes, rationale, and hunks matching pre/post report text whenever the final report changes after snapshot. Tests cover logged small patches. |
| HR-CODEX-028 | warning | closed | Fresh synced-skill execution through `codex exec` was previously believed blocked by local Codex CLI/model compatibility. | Closed by using the RAWR forked CLI: `codex-rawr exec` reported `OpenAI Codex v0.126.0-alpha.3`, used `gpt-5.5`, invoked `hyperresearch-codex`, drove the real-backend packet-mode light route, wrote five packet outputs with hashed artifact commitments, captured `https://www.python.org/about/`, and passed validation. Evidence is recorded in `evidence.md` and `spec/evidence/2026-05-03-codex-rawr-packet-proof/`. |
| HR-CODEX-031 | blocking | closed | The fresh Codex-RAWR proof exposed a CLI surface mismatch: `start` and `advance` accepted `--backend`, but `validate --backend real` failed before ledger validation. | Added `--backend real|fixture` to `rawr hyperresearch codex validate` for command-surface symmetry. Validation remains ledger-only and does not execute backend calls; plugin tests cover `validate --backend real`. |
| HR-CODEX-029 | blocking | closed | The post-review cleanup still left run business files at the `modules/runs` root and concentrated V8 business logic in top-level `shared/helpers`, violating the module topology rule. | Moved run internals to `modules/runs/helpers`, fixture internals to `modules/fixtures/helpers`, removed `shared/helpers`, kept only the CLI backend adapter under `shared/adapters`, and added service-shape ratchets for this exact failure mode. |
| HR-CODEX-030 | blocking | closed | The second review loop found non-atomic packet fan-in, same-shaped packet artifact contracts, overclaimed source dedupe, and patch-log hunk validation weaker than the spec. | Fan-in now leaves all jobs pending until every output exists and rereads every output before completion; packets include role-assigned artifact sets; captured URLs are not refetched; patch logs must be accepted and cover added/removed changed lines. Tests cover these cases. |

## Phase Exit

Spec packet is sufficient for the current minimal runtime slice when:

- `HR-CODEX-001` through `HR-CODEX-003` remain closed.
- Component tests pass.
- Any open warnings are explicitly carried into the next loop.

Full V8 implementation may start after this review loop because the adapter matrix now has rows for all 16 steps and all role agents.

Carried dispositions:

- `HR-CODEX-008`: guarded workaround. Hooks/custom-agent packaging are not the acceptance proof; runner gates and synced skill execution are.
- `HR-CODEX-009`: closed by the V8 step and role-agent adapter matrix in `PARITY_MATRIX.md`.
- `HR-CODEX-012`: release-visible warning only. Hyperresearch scoped sync must be clean; unrelated global drift is not an implementation blocker.
- `HR-CODEX-019`: closed by downstream start/advance workflow material and scoped Codex sync proof.
- `HR-CODEX-020`: closed by keeping public input/output schemas in `contract.ts` and only standalone durable domain schemas in `entities.ts`.
- `HR-CODEX-021`: closed by removing decorative same-shape runner helpers and keeping procedure flow in module routers.
- `HR-CODEX-022`: closed by joining packet-mode agent fan-in with required CLI execution before step completion, including all-URL capture and malformed URL blocking.
- `HR-CODEX-023`: closed by the `fixtures`/`runs` service topology and structural ratchets.
- `HR-CODEX-024`: closed by snapshot-copy patch guard validation and negative coverage.
- `HR-CODEX-025`: closed by packet artifact-write validation and required-artifact coverage.
- `HR-CODEX-026`: closed by source-capture provenance and claim-trace schema/source/report validation.
- `HR-CODEX-027`: closed by patch-log hash and hunk coverage for post-snapshot report edits.
- `HR-CODEX-028`: closed by fresh Codex-RAWR exec proof through the synced skill workflow.
- `HR-CODEX-029`: closed by removing module-root run helper files and top-level `shared/helpers`; the structural test now asserts the allowed root entries for each module and the allowed `shared` entries.
- `HR-CODEX-030`: closed by atomic packet fan-in, assigned packet artifact contracts, no-refetch source capture dedupe, accepted patch-log changed-line coverage, and component tests for the new gates.
- `HR-CODEX-031`: closed by accepting `--backend` on `validate` and testing the command.
