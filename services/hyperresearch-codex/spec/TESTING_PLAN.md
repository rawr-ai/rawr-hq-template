# Testing Plan

## What Is Being Tested

The current claim is that Codex can orchestrate the Hyperresearch control-plane shape through a template-owned service/CLI while delegating allowlisted backend operations to a Hyperresearch CLI backend.

Evidence exists at two levels:

- Synthetic slice: three-step smoke for fresh step loading, ledger resume, CLI audit, and final artifact integrity.
- V8 fixture slice: all 16 V8 step references, light/full tier routing, packet-mode agent fan-out/fan-in, required CLI-call failures, patch-snapshot state, validation, and downstream Codex sync surface.

The remaining proof class is a long research-quality run with human-reviewed final-report provenance. It is a release-evidence gate after the Codex-RAWR packet-provenance light proof, not an implementation blocker for packet provenance.

## Correctness Oracles

- Step loader records fresh path/hash/timestamp before a step completes.
- Ledger survives interruption and resumes at the correct next step.
- CLI calls are allowlisted and auditable.
- Completed steps have required artifacts.
- Packet-mode steps with agents complete only when agent outputs declare commitments for every required artifact and the files match their hashes.
- Source-capture provenance records captured URLs, CLI call indexes, evidence, and suggested-by agent jobs.
- Completed V8 runs include `research/claim-trace.json`, and claim-trace source URLs must map to captured sources or explicit uncertainty.
- Final-report edits after the synthesis snapshot require a covering accepted patch log entry with before/after hashes, finding IDs, and hunks that match the pre/post report text and cover changed lines.
- Final acceptance blocks on failed CLI calls, failed steps, missing artifacts, or unclosed blocking review findings.
- Final plugin-system proof uses actual Codex skill/plugin runtime after RAWR sync. Current evidence proves synced skill/agent install, CLI fixture execution, and a fresh Codex-RAWR exec packet-mode light run with real source capture and claim trace. A long research-quality full run remains a release-evidence gate, not a packet-provenance implementation blocker.

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
12. Test V8 policy gates: unsupported `research`, failed required CLI call, missing required artifact, missing agent output, unclosed blocking critic finding, missing packet artifact writes, uncaptured claim-trace sources, and patch-only rewrite violation.

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
- `bun run --cwd apps/cli rawr hyperresearch codex run-fixture ... --tier light|full --json` passed after the artifact-write/claim-trace/patch-log contract update using absolute step paths.
- A missing-step CLI fixture returned `ok:false` and exit code 1 with a blocking `failed-step` finding.
- Service tests cover full-tier V8 fixture routing, packet-mode resume, permanent failed-agent blocking, mismatched ledger rejection, missing source-URL blocking, and required CLI failure blocking.
- Service tests now cover service topology ratchets for `fixtures`/`runs`, role-assigned packet artifact contracts, required packet artifact commitments, atomic staggered packet fan-in, packet-mode snapshots for agent-written final reports, all-distinct packet URL capture with suggested-by provenance, malformed packet URL blocking, claim-trace schema/source/report validation, wholesale final-report rewrite blocking, rejected/incomplete patch-log blocking, and logged patch acceptance from the post-synthesis snapshot.
- `hyperresearch --version` returned `hyperresearch v0.8.5`.
- Disposable real CLI smoke passed for `init`, `status`, `note new`, `search`, `sync`, `lint`, `export json`, and successful `fetch https://www.python.org/about/`; `fetch https://example.com` failed loudly as junk content.
- Real-backend packet-mode light route passed after agent outputs supplied `sourceUrls`: `init`, `search`, `fetch https://www.python.org/about/`, `note new`, `lint`, `sync`, second `lint`, and `export json` all recorded exit code 0 in the v2 ledger, and all five light steps completed with no ledger failures. Current unit coverage additionally proves every distinct valid packet URL is scheduled for capture.
- Real-backend artifact packet smoke passed after harness-written packet outputs supplied assigned artifact commitments and `sourceUrls`: ledger `/tmp/hr-real-packet-final-gmbW0y/research/temp/hyperresearch-codex-run.json` completed the light route with `passed:true`; `sourceCaptures` recorded `https://www.python.org/about/`, both suggested-by packet jobs, CLI call index `2`, and Hyperresearch note id `about-python-pythonorg`.
- Fresh Codex-RAWR exec packet proof passed: `codex-rawr exec` (`OpenAI Codex v0.126.0-alpha.3`, `gpt-5.5`, `CODEX_HOME=~/.codex-rawr`, session `019debca-b051-77e3-bb05-738b1e0649ed`) invoked `hyperresearch-codex`, ran `rawr hyperresearch codex start`, repeated `advance --agent-mode packets --backend real`, wrote five packet outputs with assigned `artifactWrites`, captured `https://www.python.org/about/`, completed the light route, and `validate` returned `passed:true`. The original proof vault was `/tmp/hyperresearch-codex-proof.CD9fhB`; the committed evidence subset is under `spec/evidence/2026-05-03-codex-rawr-packet-proof/`; see `evidence.md`.

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
3. Invoke the synced skill in a fresh Codex session. Current status: fresh `codex-rawr exec` proof passed; the session used `hyperresearch-codex`, read the service plan, and executed the V8 service CLI workflow.
4. Verify ledger, artifacts, source-capture provenance, claim trace, patch log, and CLI call audit trail from the CLI-backed fixture workflow. Current status: run-fixture proof exists; direct CLI packet-mode real-backend light-route proof exists for artifact writes; fresh Codex-RAWR packet-mode proof exists with real source capture and claim trace.
5. Verify a compaction/resume handoff can continue from ledger state. Current status: service-level packet/resume test passed; actual Codex-session resume not run.
6. Verify patch-only phase rejects wholesale rewrites. Current status: snapshot copies and retained-line validation block apparent wholesale rewrites before long live runs.

Current observed Codex sync evidence:

- `bun run rawr plugins sync hyperresearch --dry-run --agent codex --json`
- `bun run rawr plugins sync hyperresearch --agent codex --no-install-reconcile --no-cowork --json`
- Verified synced prompt, skill, role-agent TOML files, and Codex registry entry under the active Codex homes.
- Post-artifact scoped sync updated the managed Hyperresearch workflow and skill directory; direct installed-file verification confirms the active prompt now requires `artifactWrites`, `sourceUrls`, `research/claim-trace.json`, and covering `research/patch-log.json` entries.
- Fresh `codex-rawr exec` proof is no longer blocked. The active RAWR forked CLI reports `OpenAI Codex v0.126.0-alpha.3` and successfully ran with `gpt-5.5`. The proof also exposed that `validate` lacked the `--backend` flag accepted by `start` and `advance`; the CLI now accepts `validate --backend real|fixture` for command-surface symmetry, while validation remains ledger-only.
- `rawr plugins sync drift --agent codex --json` is globally red from existing workspace drift/residuals; Hyperresearch scoped sync has no conflicts and all items are skipped/identical after the final sync pass.

## Live Research Gates

1. Short real query with 2-4 expected sources.
2. Source-backed notes exist for every material claim.
3. Final report has explicit uncertainty and no silent parity invention.
4. Reviewer traces at least three material claims from report to vault note/source metadata.

Do not claim a long full V8 research-quality pass until component, dry-run, Codex-RAWR packet provenance, and short live research-quality gates are green.
