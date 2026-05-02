# Testing Plan

## What Is Being Tested

The current claim is narrower: Codex can orchestrate a synthetic Hyperresearch control-plane slice through a template-owned service/CLI while delegating allowlisted backend operations to a Hyperresearch CLI backend.

The final V8 claim remains a target, not current evidence. It requires all 16 steps, tier routing, role agents, source provenance, critique, patch-only correction, and final report gates to be ported and tested.

## Correctness Oracles

- Step loader records fresh path/hash/timestamp before a step completes.
- Ledger survives interruption and resumes at the correct next step.
- CLI calls are allowlisted and auditable.
- Completed steps have required artifacts.
- Final acceptance blocks on failed CLI calls, failed steps, missing artifacts, or unclosed blocking review findings.
- Final plugin-system proof uses actual Codex skill/plugin runtime after RAWR sync. This is not complete until the synced skill is invoked in a fresh Codex session, not merely synced to disk.

## Component Gates

1. Typecheck `@rawr/hyperresearch-codex`.
2. Test synthetic three-step run with fake CLI backend.
3. Test bounded resume after one completed step.
4. Test unsupported operation rejection for `research`.
5. Test incomplete run produces a warning.
6. Test CLI topic command against the fake/synthetic fixture.
7. Smoke real `hyperresearch --version`.

Current observed component evidence:

- `bun run --cwd services/hyperresearch-codex typecheck`
- `bun run --cwd plugins/cli/hyperresearch typecheck`
- `bunx vitest run --project hyperresearch-codex`
- `bunx vitest run --project plugin-hyperresearch`
- `bunx nx run-many -t typecheck --projects=@rawr/hyperresearch-codex,@rawr/plugin-hyperresearch`
- `bunx nx run-many -t test --projects=@rawr/hyperresearch-codex,@rawr/plugin-hyperresearch`
- `bun run --cwd apps/cli rawr hyperresearch codex-slice ... --backend fixture --json` passed.
- `bun run --cwd apps/cli rawr hyperresearch codex-slice ... --backend fixture --json` with a missing step returned `ok:false` and exited nonzero.
- `hyperresearch --version` returned `hyperresearch v0.8.5`.

## Dry-Run Gates

1. Disposable vault with synthetic steps.
2. Real CLI smoke for `init`, `status`, `note new/show`, `sync`, `lint`, and `export` where command shape is verified.
3. Failure injection:
   - one failed CLI call,
   - one missing required artifact,
   - one failed step file load,
   - one unsupported CLI operation.

## Codex Runtime Gates

1. Install template CLI topic. Current status: template CLI topic exists in the implementation worktree and passes fixture smoke; it still needs to land in the template baseline used by downstream operators.
2. Sync downstream RAWR HQ skill/reference/agent material into Codex. Current status: observed for the scoped Hyperresearch plugin.
3. Invoke the synced skill in a fresh vault. Current status: not run.
4. Verify ledger, artifacts, and CLI call audit trail from the synced-skill invocation. Current status: not run.
5. Verify a compaction/resume handoff can continue from ledger state. Current status: service-level resume test passed; actual Codex-session resume not run.
6. Verify patch-only phase rejects wholesale rewrites once full V8 port exists. Current status: not implemented.

Current observed Codex sync evidence:

- `bun run rawr plugins sync hyperresearch --dry-run --agent codex --json`
- `bun run rawr plugins sync hyperresearch --agent codex --no-install-reconcile --no-cowork --json`
- Verified synced prompt, skill, role-agent TOML files, and Codex registry entry under the active Codex homes.
- `rawr plugins sync drift --agent codex --json` is globally red from existing workspace drift/residuals; Hyperresearch scoped sync has no conflicts and all items are skipped/identical after the final sync pass.

## Live Research Gates

1. Short real query with 2-4 expected sources.
2. Source-backed notes exist for every material claim.
3. Final report has explicit uncertainty and no silent parity invention.
4. Reviewer traces at least three material claims from report to vault note/source metadata.

Do not run a long full V8 research pass until component, dry-run, and short live gates are green.
