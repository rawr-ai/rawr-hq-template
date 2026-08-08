# Execution Queue

This is the short operating queue for the Habitat platform finalization. The
canonical design, inventory, acceptance detail, and stack dispositions remain
in [[design]], [[classification-ledger]], [[stack-cut-sheet]], and [[tasks]].

## Ground

- Canonical Habitat ground and release source:
  `main@98f34ca4c931a5e0fa4868825f86709ade603633`, tagged
  `habitat-cli-v0.5.6`.
- Gates A through C are sealed. The first active source container is Rawr's
  released-substrate adoption and owner transfer.
- The accepted pre-Gate-A semantic sieve removes only closures already
  classified for deletion and carrying no retained capability. It does not
  weaken or substitute for the publication barrier around surviving readers.
- The root is bootstrapped by registry `@habitat-ai/cli@0.5.6` while
  `apps/habitat` remains outside the Bun workspaces. Bun 1.3.14 keeps a valid
  frozen lock; the released CLI is not added as a `file:`, `link:`, or
  duplicate workspace dependency.
- oRPC service execution follows native authority: `.handler` owns non-Effect
  operations; the official `.effect` extension, installed once in
  `src/service/impl.ts`, owns Effect-backed request fibers through `handlerGen`.
  The app/process supplies `effect/context` plus `effect/wrap`, and no
  oRPC service Effect enters `ProcessExecutionRuntime`.
- Telemetry, Session Metrics, and Fluree worktrees are held adoption sources;
  they are not parallel Habitat implementation lanes.
- Merged local residue is removed before source work resumes.

## Containers

- [x] **Gate A - foundation producer**: finish the bounded task 2.8 sieve; seal
  selected, closed, constructible `service@1`; produce `runtime-schema`, the SDK
  service faces, and `HabitatCommand`; complete the admitted toolchain move;
  pass isolated-registry installed-candidate acceptance; and land the accepted
  exact-main producer. Prove plain `.handler` plus the official Effect bridge
  and reject every manual/custom runner. Leave the remaining private
  `RawrCommand`/`RawrResult` source and readers untouched, revive no condemned
  closure, and admit no second public/candidate command model. Landed at
  `main@98f34ca4c931a5e0fa4868825f86709ade603633`.
- [x] **Gate B - exact-main publication**: from the accepted Gate A exact-main
  revision, use the fixed Nx Release group to publish and registry-smoke only
  `@habitat-ai/sdk` and `@habitat-ai/cli`, then record the exact
  [release receipt](gate-b-release-receipt.json).
- [x] **Gate C - reader cutover**: only after that registry receipt, migrate
  the root Nx bootstrap to the exact released CLI, move surviving readers to
  released `HabitatCommand`, delete any condemned reader closure still
  remaining, and remove `RawrCommand`, `RawrResult`, and every predecessor
  reader with no shim, alias, fallback, or dual public authority. Sealed against
  registry `@habitat-ai/cli@0.5.6` and its exact paired SDK.
- [ ] **Rawr**: install that release, restack Session Metrics, import the three
  services and three CLI topics through native Nx, and pass destination-owned
  behavior.
- [ ] **Separation**: retain and rename Habitat platform owners, delete every
  transferred or rejected predecessor, rename the workspace, and pass the
  cumulative absence gate.
- [ ] **Runtime**: realize the private runtime owners in specification order,
  one green owner and its readers at a time; keep process-owned Effect
  context/lifetime/policy/telemetry separate from native bridge execution.
- [ ] **Harnesses**: adopt qualified telemetry and vendor behavior only beside
  the app, process, adapter, or harness owner that proves it.
- [ ] **Final release**: publish the completed Habitat runtime through the same
  SDK/CLI pair, migrate consumers, retire adoption sources, and drain Graphite.

Only the first unchecked container is active. Later containers may supply
acceptance obligations or frozen source evidence, but they do not share write
authority with the active container. Gates A through C are a temporary
publication barrier, not a compatibility architecture.
