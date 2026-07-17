## Why

The current Template still exposes a mixed web-plugin lifecycle in which repository state, an API/UI, workspace scanning, CLI web commands, and mounting paths can all imply runtime membership. That model conflicts with lifecycle authority normalization and with the dedicated canonical architecture migration.

The first C4 draft went beyond removal and began constructing a replacement app-composition and runtime-realization system. The user's categorical correction establishes that this initiative must not build or harden that transitional platform. C4 should remove the false legacy authorities, preserve only the three source-creation capabilities required by repository lifecycle, and leave the future runtime pipeline to its named owners.

## What Changes

- Delete the active `rawr plugins web ...` and `rawr plugins scaffold ...` command families, aliases, forwarding paths, help rows, and mixed factory ownership.
- Delete repository-state membership, `.rawr/state/state.json` membership consumers/producers, the state API/UI/client, workspace scan/filter/mount behavior, ID-derived web module routing, and compatibility paths.
- Remove or defer the C4-authored composition editor, AppDefinition parser, app-projection creator, snapshot/role realization, mount-readiness, live observation, and runtime-status machinery.
- Record the future composition/runtime boundary without implementing it: `defineApp(...) -> SDK derivation -> compiler -> process runtime -> adapters -> harness -> RuntimeCatalog`, entered with `startApp(...)`, as specified by the canonical architecture migration.
- Retain exactly three qualified, source-only creators: `rawr agent plugins create`, `rawr cli command create`, and `rawr cli extension create`.
- Give each retained creator a separate identity/application owner and share only qualified destination/write-plan mechanics.
- Prove deterministic preflight, collision rejection, truthful partial publication, exact-existing zero-write convergence, command semantic absence, and zero adjacent lifecycle/runtime mutation.

## Capabilities

### New Capabilities

- `legacy-membership-retirement`: removes the state-backed web membership/mounting system and prevents C4 from replacing it with another runtime authority.
- `qualified-artifact-authoring`: provides exactly three authority-specific source creators without install, lifecycle, composition, or runtime side effects.

### Modified Capabilities

None. The superseded `app-composition-authority` delta was never landed and is replaced by `legacy-membership-retirement`.

## Impact

- **Removed surfaces:** `rawr plugins web ...`, `rawr plugins scaffold ...`, repo-state membership, state API/UI/client, state-driven mounts UI, workspace scan/filter mounting, and legacy web module-serving paths.
- **Added surfaces:** `rawr agent plugins create`, `rawr cli command create`, and `rawr cli extension create` only.
- **Explicitly not added:** app composition commands, app-projection generation, mounting, runtime realization, runtime composition status, hot reload, or a transitional registry/snapshot owner.
- **Repositories:** executable implementation remains Template-only. Personal is accepted packet provenance and an explicit curated-content destination, never an executable source dependency or Git integration route.
- **Sequencing:** C4 remains parallel to C3. C5 waits for both before activating the final lifecycle command surface. The dedicated architecture migration owns any later app/runtime work.
