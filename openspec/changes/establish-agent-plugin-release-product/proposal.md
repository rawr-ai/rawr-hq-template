## Why

C1 closed official runtime and external-extension authority, but the inherited agent lifecycle still conflates content discovery, mutable projection, packaging, provider state, and service-owned undo. C2 establishes the inert Template-owned release product needed to make clean personal content into exact immutable artifacts and non-native outputs before any qualified command or provider convergence path can become reachable.

## What Changes

- Add pure, versioned `AgentPluginRelease` and closed-world `AgentPluginReleaseSet` schemas with an exact non-circular branded digest graph, closed artifact refs, release-input identity, same-input completeness witness, and complete skill/distribution ownership index.
- Add read-only source checking and clean, committed build applications whose payload bytes come only from exact Git commit/tree/blob objects and whose worktree eligibility is revalidated at publication boundaries. Dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, path-aliased, racing, or ownership-conflicting inputs fail before durable artifact output.
- Add a stable append-only-in-C2 Template-managed digest-addressed artifact store whose verified writes use atomic no-replace publication, whose complete-set envelope commits only after every member verifies, whose partial publication is reported truthfully, and whose handles never depend on a content checkout path; C2 may plan retention only from verified closed artifact refs with transitive set expansion but exposes no artifact deletion path before a later race-safe retention protocol exists.
- Add internal application contracts and implementations for future `check`, `build`, `export`, and `package` commands without adding command files, controller-manifest entries, or another runtime discovery path.
- Add deterministic Codex/Claude layout exports to explicit non-native destinations, with one generation-fenced per-scope ledger per canonical destination, path-safe atomic payload publication, provider-owned complete native-home read snapshots, ledger-bounded overwrite/retirement, targeted/full-set claim separation, and read-only repeated convergence.
- Add deterministic package output, including Cowork ZIP as a package format only. Packaging creates no provider home, receipt, status, or convergence claim.
- Add the controller-owned bounded `idle|applying|undoing` last-operation state under a root derived from verified controller runtime context and integrate export inverse actions through linearizable generation-fenced transitions and a closed owner/version-matched path-safe replay executor. It is one replaceable/recoverable capsule authority, not operation history, generic filesystem mutation, or cleanup authority.
- Reject toolkit packages, composition aliases, duplicate plugin/skill/alias/destination claims, and any attempt to place artifacts, ledgers, or undo state under the source workspace.
- **BREAKING**: no generic projection fallback, worktree-backed artifact identity, service-owned undo store, or Cowork-as-provider behavior is preserved. Existing public mixed lifecycle commands remain migration evidence and are not activated or expanded in C2.

## Capabilities

### New Capabilities

- `agent-plugin-release-product`: Canonical provider-neutral release and release-set identity, ownership closure, and pure digest contracts.
- `agent-plugin-build-artifact-store`: Clean-source eligibility, inert check/build applications, exact immutable artifact publication, sole-production read adapter, lookup, verification, and read-only pin-aware retention planning.
- `agent-plugin-managed-export`: Deterministic explicit-destination export with destination-ledger ownership, collision policy, scoped retirement, idempotence, and inverse actions.
- `agent-plugin-packaging`: Deterministic explicit-output packages, including Cowork ZIP without provider semantics.
- `agent-plugin-undo-capsule`: Controller-owned one-state bounded persistence, fencing, recovery, and replay contract for typed owner-emitted inverse actions.

### Modified Capabilities

None. C2 does not alter the landed controller or external-extension requirements.

## Impact

The change adds Template-owned release/build/export/packaging packages or services, pure schemas, stable data-home adapters, Nx projects and tests, architecture guards, and `apps/cli/src/lib/agent-plugins/undo/**`. It may mine behavior from `services/agent-config-sync` and `packages/agent-config-sync-node`, but those mixed owners do not become the new API and public command cutover waits for C5. No file under `apps/cli/src/commands/agent/plugins/**` and no controller command manifest entry is created. Provider installation/status, Oclif state, personal content/records, acceptance authorization, app composition, oRPC/effect-oRPC lane evidence, and pending Inngest materialization are outside the write set.
