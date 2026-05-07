# Workstream B Preparation Review Ledger

This ledger records the actual read-only mapper/verifier review run that
repaired the original Workstream B preparation packet. Agent outputs are
evidence candidates; DRA disposition below decides which findings change the
packet.

Review date: `2026-05-07`

Reviewed branch: `codex/workstream-b-preparation`

Reviewed commit: `0bbc3079fec4fab84210d7b6e5441612ff8571e8`

Review constraints:

- read-only repo inspection only;
- no code migrations;
- no downstream mutation;
- no global plugin sync;
- no link repair;
- no formatters or codegen.

## Agent Pairs

| Pair | Lane | Mapper | Verifier |
| --- | --- | --- | --- |
| Pair 0 | Workstream setup and authority | Raman `019e011c-1251-7c02-b674-74252e0508f6` | Harvey `019e011c-12da-76f3-af18-be3e5d2f6520` |
| Pair 1 | Session tools | Aquinas `019e011c-1318-7b02-9bfe-7246369946d4` | Meitner `019e011c-13d1-7e11-8b92-8dbbf9fd3200` |
| Pair 2 | Root undo | Mencius `019e011c-1513-7d52-ab77-30518676825a` | Laplace `019e011c-15fd-7153-b763-ec4cc97e1a46` |
| Pair 3 | DevOps | Rawls `019e0121-a8af-7ed2-8bed-8f503a0e4d65` | Hegel `019e0121-a916-7050-a23c-db7bae3b8c44` |
| Pair 4 | Plugin sync / tooling substrate | Kuhn `019e0121-a9b9-7c02-ae7a-6d5004b456ca` | Pasteur `019e0121-aa45-78d3-b192-c31c50c32896` |
| Pair 5 | Upstream fallout | Parfit `019e0121-abac-7de0-a10e-2b4eb88b7981` | Schrodinger `019e0121-acd5-7931-a347-68577d055f6a` |

## DRA Disposition Summary

All P1 and P2 findings are accepted. The packet has been repaired by adding
this ledger, updating the top-level workstream record and Next Packet, and
adding lane-specific review repair addenda. One P3 item in plugin sync is
deferred to the downstream sunset packet because it is useful but not required
to make the preparation packet truthful.

## Findings

### F-00-01: Missing Reviewer Provenance

Finding: The original preparation record claimed closure without actual
companion agent review provenance.

Evidence: `WORKSTREAM_RECORD.md` claimed no auxiliary reviewers were used and
treated lane self-checks as review. Raman and Harvey both identified this as a
proof-boundary failure.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Add actual reviewer identities, scopes, findings, and DRA
dispositions; remove claims that the first draft was independently verified.

Next Packet consequence: Future lane sessions must read this ledger before
treating lane packets as reviewed.

### F-00-02: Closure State Depended On Transcript/Git Archaeology

Finding: The original record pointed to the final response or git history for
verification instead of recording the evidence inside the artifact tree.

Evidence: Harvey identified stale closure/status wording and verification
details that lived outside the durable artifact tree.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Record branch, reviewed commit, Graphite state, verification
commands, skipped-check rationale, and repair disposition inside the artifacts.

Next Packet consequence: Future agents can start from the artifact tree without
transcript archaeology, then rerun first commands for freshness.

### F-00-03: `AGENTS_SPLIT.md` Omitted From First Reads

Finding: The Next Packet did not require `AGENTS_SPLIT.md`, even though repo
routing says it is the first destination-decision doc.

Evidence: Harvey noted `AGENTS.md` routes to `AGENTS_SPLIT.md`, while the Next
Packet omitted it.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: Add `AGENTS_SPLIT.md` to first reads with an explicit warning
that Workstream B supersedes stale DevOps split-model claims.

Next Packet consequence: Future agents should read the split doc but not let
stale personal-owned DevOps language reopen the locked decision.

### F-01-01: Facet-Only Session Search Was Implied But Undecided

Finding: The session-tools packet implied `rawr sessions search --has-*` can run
without metadata/content query input, but downstream currently requires a query
or reindex input.

Evidence: Meitner verified the upstream README/example and packet wording
against downstream CLI search behavior.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Make facet-only search an explicit bounded service mode with
tests, instead of copying downstream query-gated behavior accidentally.

Next Packet consequence: Session-tools implementation must choose service API
shape before CLI flag wiring.

### F-01-02: Downstream CLI Test Proof Was Overstated

Finding: Downstream package tests prove facet extraction and custom Codex
payload parsing, but downstream CLI tests do not prove CLI facet behavior.

Evidence: Aquinas and Meitner found package-level tests for facets/custom tools
and only placeholder downstream plugin tests.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Separate package behavior evidence from CLI proof and require
upstream CLI tests for facet flags, composition, and `--print-facets`.

Next Packet consequence: Downstream CLI parity remains unproven until upstream
CLI tests exist.

### F-01-03: Session Search Limit Semantics Were Under-Specified

Finding: The packet warned about unbounded transcript reads but did not decide
whether `limit` caps candidates before filtering or final hits after filtering.

Evidence: Meitner compared the packet wording to downstream search filtering,
which filters the preloaded candidate set.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.85`

Repair demand: Define bounded facet search as scanning within an explicit
candidate cap, with tests for sessions beyond the result boundary.

Next Packet consequence: Implementation must not approve the service contract
without limit/candidate tests.

### F-02-01: Undo Lifecycle Helper Was Not Public API

Finding: The undo packet said implementation could wire the command without
deciding service API shape, but command expiration is still an internal helper.

Evidence: Mencius mapped the upstream internal helper and Laplace flagged the
missing public export.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.88`

Repair demand: Choose the public lifecycle binding now: export
`expireUndoCapsuleOnUnrelatedCommand` through the narrow
`@rawr/agent-config-sync/undo` surface.

Next Packet consequence: Undo implementation must include this export and
tests; it must not proceed as if the API already exists.

### F-02-02: Upstream Undo Behavior Tests Were Missing

Finding: Upstream service tests asserted shape but did not cover undo capture,
dry-run, apply, clear, and expiration behavior.

Evidence: Laplace compared upstream service tests with downstream
`@rawr/agent-sync` behavior tests.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Require service-level undo behavior tests for success, dry-run
preservation, no capsule, unsupported provider, failed operation, and
related/unrelated command expiration.

Next Packet consequence: These tests are implementation acceptance tests, not
optional edge coverage.

### F-02-03: Undo JSON And Dry-Run Contract Was Under-Specified

Finding: The undo spec named behavior but did not pin the JSON failure envelope,
exit statuses, or dry-run capsule preservation.

Evidence: Mencius and Laplace mapped downstream command behavior and upstream
service gaps.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.82`

Repair demand: Pin success JSON, service failure JSON, missing workspace root
JSON/exit `2`, service failure exit `1`, human output, and dry-run preservation.

Next Packet consequence: CLI tests must assert these shapes directly.

### F-03-01: DevOps Safety Invariants Were Not Concrete Enough

Finding: DevOps packet said Graphite-first/non-interactive but did not specify
the safety invariants needed before migrating downstream commands.

Evidence: Rawls and Hegel found downstream raw `git switch -c` / `git merge`
repo-sync behavior, downstream worktree cleanup behavior, and upstream Graphite
contracts requiring `gt`-first branch/stack operations.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.9`

Repair demand: Add explicit invariants: `gt` owns branch/stack mutation unless
justified; no prompts/editors; check `git status`, `gt ls`, and
`git worktree list --porcelain`; never remove current worktree; cleanup defaults
to merged-only; distinguish live pinned worktrees from stale metadata; no
implicit sync/link repair.

Next Packet consequence: DevOps implementation must carry these as opening
constraints.

### F-03-02: DevOps JSON Contract Was Named But Not Specified

Finding: The packet asked for JSON contracts but did not define public wrapper,
stable fields, dry-run plans, warnings, or error codes.

Evidence: Hegel compared downstream result types with `RawrCommand` JSON
wrapper behavior.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.86`

Repair demand: Require fixture-level JSON contracts for every DevOps command.

Next Packet consequence: Future implementation must add JSON fixture/snapshot
tests before claiming CLI parity.

### F-03-03: DevOps Downstream Defaults Were Unsafe As Template Defaults

Finding: Downstream `repo sync-upstream` defaults plugin convergence on, and
downstream worktree cleanup defaults link healing on.

Evidence: Rawls mapped downstream defaults and upstream policy that full plugin
sync/convergence belongs in personal runtime operations, not implicit template
devops defaults.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.88`

Repair demand: Make convergence and link healing opt-in upstream, reconcile
scratch policy with upstream `hq-ops`, and add `apps/cli/package.json` plus root
project lists as touch surfaces.

Next Packet consequence: DevOps migration must parameterize personal behavior
instead of importing it as shared governance.

### F-03-04: DevOps Flag Naming Needed Explicit Choice

Finding: Packet proposed `--converge-after|--no-converge-after`, while
downstream exposes `--no-converge`.

Evidence: Hegel compared the packet with downstream CLI flags.

Severity: `P3`

Disposition: `accepted`

Confidence: `0.75`

Repair demand: Choose upstream spelling explicitly and mark divergence as
intentional.

Next Packet consequence: Avoid accidental flag churn during implementation.

### F-04-01: Plugin Sync Gates Were Weaker Than Canonical Testing Plan

Finding: The plugin-sync readiness gates could allow closure from unit/typecheck
checks without proving external `--source-workspace` behavior.

Evidence: Pasteur compared readiness gates with
`services/agent-config-sync/test/TESTING_PLAN.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.86`

Repair demand: Require bounded downstream `--source-workspace` dry-run/drift
proof as non-mutating validation, without global sync/link repair.

Next Packet consequence: Unit/typecheck gates alone cannot close sync parity.

### F-04-02: Plugin Sync Downstream Sunset Scope Was Overbroad

Finding: Downstream `plugins/cli/plugins/**` contains operator guidance,
install-state, and lifecycle material, not only duplicate sync implementation.

Evidence: Kuhn and Pasteur mapped downstream package and plugin CLI contents.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.82`

Repair demand: Add downstream behavior inventory before sunset and classify each
surface as remove, port, preserve, or stale-doc cleanup.

Next Packet consequence: Downstream sunset must start with preservation
inventory, not deletion.

### F-04-03: Plugin Sync Mixed Oclif/Dependency Drift Needs Ledger

Finding: Mixed command/dependency drift was recognized but not converted into a
proof requirement.

Evidence: Pasteur compared upstream and downstream plugin CLI package
dependencies and command surfaces.

Severity: `P3`

Disposition: `deferred`

Confidence: `0.78`

Repair demand: Add oclif command/dependency comparison before downstream sunset.

Next Packet consequence: Deferred to downstream sunset packet; do not let sync
parity imply CLI/install parity.

### F-05-01: Upstream Fallout Missed Active MFE References

Finding: MFE demo removal scope missed active references in test config, hq-ops
tests, and lockfile.

Evidence: Parfit and Schrodinger found `vitest.config.ts`,
`services/hq-ops/test/ports-backed-service.test.ts`, and `bun.lock` references
outside the original search surface.

Severity: `P1`

Disposition: `accepted`

Confidence: `0.95`

Repair demand: Broaden removal evidence and gates to active source/config/lock
surfaces; require Vitest project removal and lockfile update; require a
test-local fixture rather than retaining or recreating `mfe-demo`.

Next Packet consequence: Upstream fallout cannot claim MFE references are
captured until this expanded gate is part of the packet.

### F-05-02: Coordination Cleanup Gate Was Too Broad

Finding: Raw `/coordination` grep conflated active stale docs, valid Inngest
runtime references, and archive/provenance material.

Evidence: Schrodinger mapped the broad grep to active stale docs and valid
Inngest-adjacent runtime text, including `DESIGN_DATA_INTEGRATION_PLAN.md`.

Severity: `P2`

Disposition: `accepted`

Confidence: `0.87`

Repair demand: Split coordination cleanup into classified gates: active stale
route/command docs, archive/quarantine allowlist, and Inngest/runtime preserve
gate. Add `docs/process/DESIGN_DATA_INTEGRATION_PLAN.md` to active stale-doc
inventory.

Next Packet consequence: Future implementers must classify matches before
deleting or rewriting.
