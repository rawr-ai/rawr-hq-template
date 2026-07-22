# Flows

## Runtime Flow

`user prompt -> Codex Hyperresearch skill -> canonical query persisted -> vault bootstrap -> tier route selected -> fresh step load -> Codex subagent wave -> Hyperresearch CLI source capture -> evidence digest -> draft ensemble -> synthesis -> critics -> gap fetch -> patch-only correction -> polish/readability -> lint/export/integrity gates -> final report`

## Fresh-Step Flow

1. Read the run ledger.
2. Resolve the next incomplete step.
3. Read that step file from disk.
4. Compute SHA-256 over the exact loaded body.
5. Record path, hash, title, and timestamp in the ledger.
6. Execute only that step contract.
7. Verify required artifacts for completed steps.
8. Advance `currentStepId`.

## Resume Flow

1. Read this Template-owned spec packet and service contract.
2. Read `research/temp/hyperresearch-codex-run.json`.
3. Inspect completed artifacts instead of reconstructing from chat.
4. Add a resume event with reason and next step.
5. Reload the next step fresh.
6. Continue from the ledger state.

## Source Flow

1. Candidate URL is found by Codex search or a source/fetcher agent.
2. Parent records suggested-by chain.
3. Capture goes through `hyperresearch fetch` or `fetch-batch`.
4. Vault note/source metadata stores provenance.
5. Synthesis reads back notes via vault search/read.
6. Lint checks disconnected provenance and source coverage.

## Agent Flow

1. Parent constructs packet with canonical query, role, pipeline position, required inputs, expected output path, and schema.
2. Parent spawns role agent or uses a custom Codex agent.
3. Agent writes only its assigned artifact.
4. Parent validates artifact exists and matches schema.
5. Parent records accepted or rejected output in ledger.

## Failure Flow

1. Failure is classified as `cli`, `artifact`, `step`, or `policy`.
2. Retry only when deterministic and bounded.
3. Otherwise mark step failed and block phase exit.
4. Deferrals require owner, rationale, evidence, and revisit trigger.

## Final Plugin-System Proof Flow

1. Install the ordinary versioned `@rawr/cli` package containing the
   Hyperresearch topic after the fixed Nx Release group lands.
2. Bind a governed immutable curated-content artifact to its exact Template interface version, release-set digest, and record digests.
3. Use the Template-owned agent-plugin lifecycle and provider adapter to install that artifact into an explicit disposable Codex home.
4. Start Codex in a fresh vault directory and invoke the artifact-backed Hyperresearch skill.
5. Confirm the service runner is used, not `hyperresearch research`.
6. Confirm CLI calls, step hashes, subagent outputs, artifacts, lint/export, and final report.
7. Run a short real query with 2-4 expected sources before any long full run.
8. Repeat the converged lifecycle operation and prove that it performs reads only.
