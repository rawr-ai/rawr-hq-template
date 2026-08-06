## 1. Prove The Workspace Boundary

- [x] 1.1 Prove that Nx establishes the workspace root independently of rule filesets and that its explicit root-override environment participates in the runtime hash.
- [x] 1.2 Preserve recursive acquisition inputs for every non-workspace directory and remove only the redundant workspace-root recursion.

## 2. Narrow Compatibility Inputs

- [x] 2.1 Project exact workspace-root compatibility coverage, rule authority, runner assets, and runtime inputs without recursive unrelated descendants.
- [x] 2.2 Update projection behavior tests for unrelated files, sibling-only coverage, and covered additions, changes, and deletions.
- [x] 2.3 Correct Habitat execution-topology documentation to describe the current per-program Grit process boundary.

## 3. Verify Cache Behavior

- [x] 3.1 Run the focused Habitat CLI projection test target and TypeScript gate.
- [x] 3.2 Use a command-recording Habitat shim under native Nx to prove that an edit outside the owner-wide input union invokes neither focused nor owner checks, while a sibling-only covered edit leaves the unrelated focus hot and invalidates the sibling plus owner.
- [x] 3.3 Use the same native Nx fixture to prove covered add/change/delete and representative manifest, baseline, runner, catalog, and runtime invalidation.
- [x] 3.4 Prove that a cold or invalidated owner adds exactly one `--owner` call, a warm repeat adds none, and no focused `--rule` call is scheduled.
- [ ] 3.5 Run the real owner Habitat policy check, repeat it unchanged, and record cold versus cache-hit evidence without clearing unrelated caches.

## 4. Review And Land

- [x] 4.1 Complete independent Nx, behavior-test, TypeScript, and structural-code-quality review with no unresolved P0/P1 finding.
- [ ] 4.2 Land the reviewed Graphite stack on canonical `main`, drain the merged branch, and archive this change.
