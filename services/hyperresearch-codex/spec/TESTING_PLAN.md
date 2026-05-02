# Testing Plan

## What Is Being Tested

The current claim is that Codex can orchestrate the Hyperresearch control-plane shape through a template-owned service/CLI while delegating allowlisted backend operations to a Hyperresearch CLI backend.

Evidence exists at two levels:

- Synthetic slice: three-step smoke for fresh step loading, ledger resume, CLI audit, and final artifact integrity.
- V8 fixture slice: all 16 V8 step references, light/full tier routing, packet-mode agent fan-out/fan-in, required CLI-call failures, patch-snapshot state, validation, and downstream Codex sync surface.

The remaining claim not yet made is a long live research run with real web sources and human-reviewed final-report provenance.

## Correctness Oracles

- Step loader records fresh path/hash/timestamp before a step completes.
- Ledger survives interruption and resumes at the correct next step.
- CLI calls are allowlisted and auditable.
- Completed steps have required artifacts.
- Final acceptance blocks on failed CLI calls, failed steps, missing artifacts, or unclosed blocking review findings.
- Final plugin-system proof uses actual Codex skill/plugin runtime after RAWR sync. Current evidence proves synced skill/agent install and CLI fixture execution; a long real live run still requires source-backed report evidence.

## Component Gates

1. Typecheck `@rawr/hyperresearch-codex`.
2. Test synthetic three-step run with fake CLI backend.
3. Test bounded resume after one completed step.
4. Test unsupported operation rejection for `research`.
5. Test incomplete run produces a warning.
6. Test CLI topic command against the fake/synthetic fixture.
7. Smoke real `hyperresearch --version`.
8. Test V8 start creates a version-2 ledger, canonical query file, scaffold, route steps, and Hyperresearch `init` audit call.
9. Test V8 advance across light and full fixture routes with all step references loaded fresh and all required artifacts written.
10. Test V8 packet mode stops at `awaiting_agents`, writes packet files, then resumes after expected output files exist.
11. Test V8 resume rejects mismatched query, tier, vault, route, or ledger version.
12. Test V8 policy gates: unsupported `research`, failed required CLI call, missing required artifact, missing agent output, unclosed blocking critic finding, and patch-only rewrite violation.

Current observed component evidence:

- `bun run --cwd services/hyperresearch-codex typecheck`
- `bun run --cwd plugins/cli/hyperresearch typecheck`
- `bunx vitest run --project hyperresearch-codex`
- `bunx vitest run --project plugin-hyperresearch`
- `bunx nx run-many -t typecheck --projects=@rawr/hyperresearch-codex,@rawr/plugin-hyperresearch`
- `bunx nx run-many -t test --projects=@rawr/hyperresearch-codex,@rawr/plugin-hyperresearch`
- `bun run --cwd apps/cli rawr hyperresearch codex-slice ... --backend fixture --json` passed.
- `bun run --cwd apps/cli rawr hyperresearch codex-slice ... --backend fixture --json` with a missing step returned `ok:false` and exited nonzero.
- `bun run --cwd apps/cli rawr hyperresearch codex run-fixture ... --tier light --json` passed.
- `bun run --cwd apps/cli rawr hyperresearch codex run-fixture ... --tier full --json` passed.
- Service tests cover full-tier V8 fixture routing, packet-mode resume, permanent failed-agent blocking, mismatched ledger rejection, missing source-URL blocking, and required CLI failure blocking.
- `hyperresearch --version` returned `hyperresearch v0.8.5`.
- Disposable real CLI smoke passed for `init`, `status`, `note new`, `search`, `sync`, `lint`, `export json`, and successful `fetch https://www.python.org/about/`; `fetch https://example.com` failed loudly as junk content.
- Real-backend packet-mode light route passed after agent outputs supplied `sourceUrls`: `init`, `search`, `fetch https://www.python.org/about/`, `note new`, `lint`, `sync`, second `lint`, and `export json` all recorded exit code 0 in the v2 ledger, and all five light steps completed with no ledger failures.

## Dry-Run Gates

1. Disposable vault with synthetic steps.
2. Real CLI smoke for `init`, `status`, `note new/show`, `sync`, `lint`, and `export` where command shape is verified.
3. Failure injection:
   - one failed CLI call,
   - one missing required artifact,
   - one failed step file load,
   - one unsupported CLI operation.
4. Fixture full-route run through `rawr hyperresearch codex run-fixture`.
5. Fixture resume run through `rawr hyperresearch codex start` plus repeated `advance`.
6. Fixture packet-mode run where the test harness writes declared agent outputs and `advance` validates them.

## Codex Runtime Gates

1. Install template CLI topic. Current status: template CLI topic exists in the implementation worktree, builds into oclif command discovery, and passes fixture smoke.
2. Sync downstream RAWR HQ skill/reference/agent material into Codex. Current status: observed for the scoped Hyperresearch plugin after V8 workflow and 14 role-agent updates.
3. Invoke the synced skill in a fresh Codex session. Current status: discoverability smoke passed with `codex exec` in read-only mode; the session used `hyperresearch-codex` and reported the installed skill boundary.
4. Verify ledger, artifacts, and CLI call audit trail from the CLI-backed fixture workflow. Current status: run-fixture proof exists; direct CLI packet-mode real-backend light-route proof exists; synced-skill manual workflow remains a human-in-the-loop run.
5. Verify a compaction/resume handoff can continue from ledger state. Current status: service-level packet/resume test passed; actual Codex-session resume not run.
6. Verify patch-only phase rejects wholesale rewrites. Current status: snapshot and patch-guard state exist; explicit rewrite-diff threshold should be hardened before long live runs.

Current observed Codex sync evidence:

- `bun run rawr plugins sync hyperresearch --dry-run --agent codex --json`
- `bun run rawr plugins sync hyperresearch --agent codex --no-install-reconcile --no-cowork --json`
- Verified synced prompt, skill, role-agent TOML files, and Codex registry entry under the active Codex homes.
- Fresh read-only `codex exec` verified the installed `hyperresearch-codex` skill now instructs agent packets to include `sourceUrls` for URLs the service should capture through the Hyperresearch CLI.
- `rawr plugins sync drift --agent codex --json` is globally red from existing workspace drift/residuals; Hyperresearch scoped sync has no conflicts and all items are skipped/identical after the final sync pass.

## Live Research Gates

1. Short real query with 2-4 expected sources.
2. Source-backed notes exist for every material claim.
3. Final report has explicit uncertainty and no silent parity invention.
4. Reviewer traces at least three material claims from report to vault note/source metadata.

Do not run a long full V8 research pass until component, dry-run, and short live gates are green.
