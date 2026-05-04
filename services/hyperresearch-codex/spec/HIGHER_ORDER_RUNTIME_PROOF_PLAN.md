# Higher-Order Runtime Proof Plan

This plan defines the first acceptance proof after the packet-provenance service contract. It is intentionally narrower than full Hyperresearch V8 parity: it proves live Codex/RAWR runtime behavior that was previously unproven, while keeping Hooks/MCP, full-tier depth work, and long-form research quality out of scope until separately validated.

## Baseline

- Template baseline: `220885d1 test(hyperresearch): prove codex rawr packet workflow`.
- Downstream baseline: `af264960 docs(hyperresearch): sync codex rawr proof evidence`.
- Completed claim: service implementation and packet provenance contract are green.
- Remaining target: runtime evidence that native `codex-rawr exec` can drive the synced Hyperresearch workflow with role-agent fan-out, resume, multiple source captures, final claim trace, and service validation.

## Proof Scope

Run a fresh `codex-rawr exec` session against the template worktree. The session must:

1. Use the installed `hyperresearch-codex` skill/workflow and the RAWR CLI surface:
   - `rawr hyperresearch codex start`
   - `rawr hyperresearch codex advance --agent-mode packets --backend real`
   - `rawr hyperresearch codex validate --backend real`
2. Start a light-tier real-backend V8 run for a bounded research query that can be supported by 2-4 public sources.
3. Stop at packet gates and use native Codex `spawn_agent`/wait/close behavior for the named Hyperresearch role agents.
4. Require each spawned role agent to read its packet and write the declared `expectedOutputPath` JSON.
5. Require packet outputs to include assigned `artifactWrites` with SHA-256 hashes and `sourceUrls` for parent-owned Hyperresearch CLI source capture.
6. Deliberately stop after at least one `awaiting_agents` gate and resume the same Codex session with `codex-rawr exec resume <session-id>`, using the same ledger.
7. Complete the route with at least 2 captured source URLs and at least 3 material final-report claims traced in `research/claim-trace.json`.
8. Preserve a service-local evidence subset under `services/hyperresearch-codex/spec/evidence/<date>-codex-rawr-runtime-proof/`.

## Query

Use this bounded query unless a blocker requires a same-sized replacement:

> What are the practical compatibility implications of Python's packaging metadata standards for modern Python project installers? Focus on how `pyproject.toml`, core metadata, and dependency groups affect installer behavior, and cite only Python Packaging Authority or official Python documentation sources.

Rationale:

- Public, stable, sourceable from official docs.
- Naturally supports 2-4 sources.
- Narrow enough for a light-route proof.
- Allows at least three factual claims without needing long-form full-tier depth work.

Preferred source URLs:

- `https://packaging.python.org/en/latest/specifications/pyproject-toml/`
- `https://packaging.python.org/en/latest/specifications/core-metadata/`
- `https://packaging.python.org/en/latest/specifications/dependency-groups/`
- `https://packaging.python.org/en/latest/tutorials/packaging-projects/`

## Acceptance Criteria

The proof is green only if all of these are true:

- `codex-rawr exec` event logs show at least one native `spawn_agent` call for a `hyperresearch-*` role agent during the real run, not only the separate capability probe.
- The run ledger records a resume event created by an `advance` call with a non-empty resume reason after `codex-rawr exec resume`.
- The ledger reaches `completed: true` and `validate` returns `passed: true`.
- The ledger records real backend CLI operations including `init`, `search`, at least two `fetch` calls, `note`, `lint`, `sync`, and `export`.
- `sourceCaptures` contains at least two distinct HTTP(S) URLs with CLI call indexes and suggested-by packet job provenance.
- `agentJobs` contains completed jobs for the light route packet roles.
- Every packet output has assigned `artifactWrites`; every declared hash matches the file content in the vault.
- The final report exists under `research/notes/`.
- `research/claim-trace.json` contains at least three claims whose text appears in the final report and whose source URLs map to captured source URLs.
- The checked-in evidence README explicitly states what this proof does not claim.

## Non-Claims

This proof does not claim:

- full-tier 16-step V8 research parity,
- Hooks/MCP runtime parity,
- long-form report quality parity,
- automatic parent-side orchestration without prompt guidance,
- global downstream plugin drift resolution,
- PR submission or release readiness.

## Evidence To Preserve

Preserve only reviewable evidence, not the full temp vault:

- wrapper prompt, final output, stderr, and JSONL events;
- start/advance/resume/validate command JSON output;
- final ledger;
- packet JSONs and packet result JSONs;
- final report;
- claim trace;
- captured source notes or exported vault JSON if present;
- a short proof README with session id, command surface, source URLs, role-agent evidence, resume evidence, validation status, and non-claims.

Do not preserve SQLite vault internals, browser/session secrets, auth material, or unrelated temp files.

## Review

After the proof, run a default-agent review pass focused on:

- whether the evidence actually proves native role-agent fan-out,
- whether resume was real and ledgered,
- whether claim trace/source capture validation is honest,
- whether specs and downstream material need updates,
- whether any topology or service-law regression was introduced.

## Result

Status: passed, with a runtime-orchestration caveat.

Evidence: `spec/evidence/2026-05-03-codex-rawr-runtime-proof/`

Observed outcomes:

- Initial `codex-rawr exec` started the real-backend light run and stopped at `awaiting_agents` for `02-width-sweep`.
- `codex-rawr exec resume 019debf6-73ab-7622-8d58-3afc26212616` continued the same ledger and recorded a resume event with reason `codex-rawr exec resume higher-order runtime proof`.
- Native Codex role-agent calls wrote packet outputs for `hyperresearch-fetcher`, `hyperresearch-source-analyst`, `hyperresearch-draft-orchestrator`, `hyperresearch-polish-auditor`, and `hyperresearch-readability-recommender`.
- The ledger captured four official PyPA URLs through real Hyperresearch CLI `fetch` calls.
- The final claim trace maps five final-report claims to captured source URLs.
- `advance-05` correctly blocked an invalid claim-trace source shape. A follow-up repair produced a claim trace using source objects, after which `advance-06` completed with no integrity findings and `validate --backend real` returned `passed:true`. That repair is artifact/service-gate proven, not clean child-completion proven.

Caveat:

- Parent waits around readability repair remained stuck after artifacts existed and were hash-valid. The service gates passed, but normal child completion for the repair pass was not proven in this historical run. Later `HR-CODEX-035` handling closes the Hyperresearch service plus packet-orchestration path through explicit child resume for known child ids after parent resume; ledgered replacement attempts remain fallback hardening when a child attempt still classifies non-clean.
