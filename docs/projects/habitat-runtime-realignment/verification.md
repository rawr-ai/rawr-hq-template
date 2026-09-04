# Realignment Verification

Date: 2026-09-04. Baseline: `374149800a067e527342e334ff6a3022fbd38cd7`.
Scope: authority, execution readiness and immutable policy successors, not
implementation of the revised runtime. Git history and the admission PR identify
the exact candidate; this file does not manufacture a future CI result.

## Local Evidence

Commands ran in the isolated realignment worktree with Bun's frozen lockfile.
No dependency version, lockfile, runtime source, public export map or release
version changed.

| Check | Actual result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; no lock change. |
| `bunx nx run-many -t check:policy -p runtime-definition,runtime-derivation,runtime-compiler,runtime-bootgraph --skip-nx-cache` | Passed all four selected complete successor rules. |
| `bunx tsc -p apps/habitat/test/tsconfig.json --noEmit` | Passed for installed-package test changes. |
| `bunx biome check apps/habitat/test/installed-package.test.ts packages/core/sdk/habitat-pack.json` | Passed after final test edits. |
| `bunx nx run @habitat-ai/cli:acceptance:oclif-installed-package` | Nine tests passed in a real isolated registry/installed SDK+CLI consumer on the local macOS host. The first run built ten prerequisites uncached; the final test rerun reused unchanged prerequisites. |
| `bunx nx run-many -t check,test -p runtime-definition,runtime-derivation,runtime-compiler,runtime-bootgraph --skip-nx-cache --outputStyle=static` | Passed all four owner graphs and 15 prerequisites, uncached. Tests: 20 definition, 22 derivation, 31 compiler, 19 bootgraph. These validate unchanged source and new selected policy, not the future semantic repair. |
| `bunx nx run habitat:acceptance:product-separation-absence --skip-nx-cache --outputStyle=static` | Seven tests, 37 assertions and ten uncached build/manifest prerequisites passed. |
| `bun run check` | Full repository check passed 26 projects plus 66 prerequisites. The final composed rerun passed with 47 of 92 task outputs cached; the earlier full run had eight cache hits. |
| `openspec validate realize-app-runtime-spine --type change --strict --no-interactive` | Passed after all semantic and review corrections. |
| `openspec validate --specs --strict --no-interactive` | All 17 canonical specs passed. No unfinished delta was applied or archived. |
| `openspec instructions apply --change realize-app-runtime-spine --json` | Native apply reads the active artifacts and selects 0.1 first: 49 remaining, zero newly completed. Artifact-presence status is not runtime completion. |
| Active `git diff --cached --check` | Passed on staged active changes, excluding the byte-preserved quarantine trees. Historical snapshots are not rewritten to normalize old content. |

## Positive And Negative Policy Proof

The installed consumer resolves complete definition/derivation version 3 and
compiler/bootgraph version 2, while retaining the earlier definitions. Each
successor accepts legitimate nested TypeScript helpers and test/typecheck
support. It refuses missing assembly entry, missing behavioral proof, nested
package or owner declarations, non-TypeScript source, and wrong file/directory
kinds. The grammar stays positively closed. SDK asset carriage creates no fake
runtime source dependency.

All 98 preexisting blueprint files remain byte-identical. The eight predecessor
installed-fixture writers were compared as parsed TypeScript function bodies and
remain unchanged. Existing fixture/byte proofs were retained, with historical
asset hashes and new successor cases added rather than replacing old coverage.

## Preservation And Routing

A task-local read-only verifier compared actual Git blobs and parsed checklist
records. Its preserved locator is the initiating Codex task
`01a06e3d-0085-79d2-99c7-683233b5938d`, workspace
`Documents/Codex/2026-09-04/okay-so-it-s-been-about`, file
`work/verify-realignment.mjs`; it ran with `bun work/verify-realignment.mjs`
from that workspace. The script pins the source worktree/baseline and performs
comparison only, not repository execution or canonicality decisions. It proved:

- Twelve historical snapshots are byte-identical to their baseline sources:
  two canonical documents, nine OpenSpec documents, and the roadmap.
- All 115 inherited task IDs occur exactly once with their original checked
  state: 57 historical checked and 58 unchecked. Current disposition retains
  47 active IDs, distributes seven owner-wide obligations, and defers four
  ledger/inquiry IDs. Two explicit repairs produce 49 current unchecked items.
- All 17 other change deltas and five JSON receipts remain byte-identical.
- Changed active Markdown local paths and heading anchors resolve. Quarantine
  bodies are historical evidence, not repaired or activated routes.
- All predecessor project identities and named behavioral acceptance targets
  survive the clean classification/deferred-source successors. Held worktrees,
  rejected stash, consumer repositories and user data were not modified.

Targeted contradiction searches and manual reads covered complete service
exports, named slots/identity, selected versus whole-app coverage, ordered source
policy, compiler input, portable decoder/digest integrity and boot trust. The
owner routers now describe the same target rather than retaining old compiler
input or one-topology-call instructions. No generated semantic report was
automatically promoted to authority.

## Review And Repairs

Three bounded lanes supplied authority/source preservation, canonical semantics,
and executable policy/independent readiness evidence. A final independent
semantic pass checked the composed target. The DRA accepted the findings in
[findings.md](findings.md), including:

- a stale optional graph oracle, fixed without weakening separation checks;
- new installed cases initially preceding native CLI setup, fixed by ordering;
- native-stop proof assigned too early, moved to its real integration owner;
- missing authoring-face delivery, explicitly assigned without empty exports;
- missing zero-config-ref source-policy handoff, completed in the target.

Known runtime source corrections remain 0.1/0.2. They are explicit unfinished
implementation, not unreported preparation failures or assertions of new behavior.

The read-only closure steward rechecked the committed packet and preservation
proof, found no additional preparation blocker, and identified only the pending
external admission gate. Its exact-command/verifier-locator note is addressed
above. The DRA owns actual Graphite admission, CI and final repository cleanup.

## Admission And Limits

Preparation is ready for Graphite admission only after local review and checks.
Completion additionally requires the admission PR to merge and the exact admitted
main revision to pass Repository Ratchet. That state is read from Git/GitHub,
not inferred from this record's presence on an unpublished branch.

Local installed acceptance covers macOS, not an unrun cross-platform matrix.
The required remote workflow checks its actual Ubuntu repository gates; it does
not stand in for a native host or vendor conformance suite. No SDK/CLI package
was published, no live runtime was implemented, and no ledger qualification,
consumer migration, hosted infrastructure change or old-task restart occurred.

Task-local analyses and read-only comparison scripts remain in the initiating
task's `work/` as evidence, not repository execution machinery. The clean
canonical documents, current OpenSpec and this workstream are the durable handoff.
