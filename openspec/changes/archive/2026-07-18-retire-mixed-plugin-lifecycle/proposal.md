## Why

The immutable release, provider, export, packaging, and promotion behavior built in C2-C3, plus controller-owned undo, is still unreachable while the installed controller continues to expose the historical mixed plugin lifecycle. C2-C3 also modeled that one domain as five peer services instead of one oRPC service with domain modules. That leaves both the public ontology and the service topology mixed. C5 corrects the service boundary, performs the atomic semantic cutover, and deletes the displaced model.

The user has separately clarified that legacy web mounting and app composition are being removed in favor of the canonical final-architecture migration. C5 therefore preserves C4's retirement and adds no replacement composition/runtime implementation.

## What Changes

- Consolidate the five C2-C3 peer packages and the release support package into one `@rawr/agent-plugin-lifecycle` oRPC service with `releases`, `vendors`, `packaging`, `exports`, `providers`, and `governance` domain modules.
- Activate service-backed commands through one typed local client. Keep the C4 `create` source-authoring command and controller-owned `undo` application outside lifecycle-transition orchestration while projecting both only at their qualified command IDs.
- Keep bare `rawr plugins install|link|uninstall|list|inspect|update|reset` exclusively for genuine external Oclif extensions.
- Delete the old agent sync, mixed plugin lifecycle, root undo, aggregate service/package, HQ Ops catalog/install/lifecycle, automatic reconciliation, generic projection, toolkit composition, and compatibility surfaces.
- Bind every service-backed lifecycle transition command to one typed service procedure with explicit absolute content-workspace, provider-home, output, destination, and Git-object inputs, plus validated absolute Git/provider executable paths at the controller projection binding where applicable.
- Add semantic guards and behavior tests that prove deleted commands, flags, imports, packages, state keys, environment variables, and active guidance are absent.
- Keep app composition, web mounting, runtime realization, protected-lane content, personal lifecycle records, and canonical live settlement outside C5.

## Capabilities

### New Capabilities

- `agent-plugin-command-lifecycle`: Exact qualified command ontology, closed input modes, owner-local dispatch, status semantics, and controller-owned undo reachability.
- `agent-plugin-vendor-management`: Explicit read-only vendor status and reviewable repository update behavior without deployment authority.
- `mixed-plugin-lifecycle-retirement`: Structural deletion of the legacy aggregate, compatibility vocabulary, and shared hidden state.
- `agent-plugin-lifecycle-service-topology`: One oRPC service boundary, exact domain-module topology, transport-neutral ports, and typed CLI projection.

### Modified Capabilities

- `external-cli-extension-boundary`: Bare `rawr plugins` is now exactly the external extension surface and contains no curated lifecycle command.
- `agent-plugin-release-product`: C2 applications become reachable only through qualified commands.
- `agent-plugin-build-artifact-store`: check/build gain qualified command reachability without crossing owner boundaries.
- `agent-plugin-packaging`: deterministic packaging gains one qualified command projection.
- `agent-plugin-managed-export`: managed export gains one qualified command projection.
- `agent-plugin-promotion`: governed validation/attestation gains one qualified read-only command projection.
- `agent-plugin-undo-capsule`: the root undo command is removed and the controller capsule becomes reachable only as `rawr agent plugins undo`.

## Impact

- Adds one canonical service package and a typed CLI runtime binding under the existing controller projection.
- Moves retained C2-C3 behavior into module-local lifecycle routers and models, adds the missing vendor procedures and read-only promotion bindings, and removes direct CLI imports of module applications.
- Deletes the five peer service packages, `@rawr/agent-plugin-release`, `@rawr/plugin-plugins`, `services/agent-config-sync`, `packages/agent-config-sync-node`, named HQ Ops modules, legacy commands, flags, docs, hooks, scripts, package metadata, and positive architecture guards.
- Does not add or modify app composition, web mounting, process/runtime realization, or personal executable paths.
