# Canonical Spec Authority Refresh

Status: `closed`.
Branch: `codex/runtime-canonical-spec-refresh`.
PR: #269.
Commit: `e8a0ddeb`.

This report records a program-level control input. It is authority hygiene for
the runtime-realization lab, not runtime architecture authority and not proof
promotion.

## Frame

Objective:

- Replace the stale repo-pinned canonical runtime realization spec with the
  external locked spec snapshot identified by the user.
- Update `proof-manifest.json` so the manifest hash matches the repo copy.
- Preserve the fact that this interruption invalidates proof promotion until
  downstream work refreshes against the new spec.

Authority correction:

- Previous repo-pinned spec hash:
  `4d7d19d2064574a7ad07a1e43013681b75eae788081ad0558cc87ca475b8d654`
- External canonical hash:
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`
- `/Users/mateicanavra/Downloads/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
  and
  `/Users/mateicanavra/Documents/projects/RAWR/assets/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
  were byte-identical at the external canonical hash.

Non-goals:

- Do not promote or demote runtime proof solely because the spec file changed.
- Do not rewrite implementation to match newly surfaced sections in this
  branch.
- Do not treat older indexed runtime/effect documents as canonical when they
  conflict with the refreshed spec.

## Findings

| Finding | Evidence | Disposition | Confidence |
| --- | --- | --- | --- |
| The repo copy was stale. | The repo file hashed to `4d7d19d...`; both external candidate files hashed to `483044fa...`. | Replace the repo file and manifest hash. | High |
| The refreshed spec adds explicit authority sections. | New spec includes authority planes, Effect execution components, process-local coordination, expanded enforcement, and lock/stale-source handling. | Future workstreams must refresh against the new sections before promotion. | High |
| The external canonical snapshot intentionally carries Markdown hard-break trailing spaces. | `git diff --check` flagged the byte-exact import before path-specific attributes. | Preserve the external hash and add a narrow `.gitattributes` whitespace exception for only this canonical spec path. | High |
| This is not proof promotion. | No runtime implementation or gate oracle changes are implied by copying the spec. | Track as `audit.canonical-spec-authority-refresh` with status `out-of-scope`. | High |

## Review Result

Leaf loops:

- Containment: repo spec copy, path-specific `.gitattributes`, manifest, focus
  log, DRA workflow, research program, effect integration map, and this report
  only.
- Mechanical: manifest hash must match the repo copy.
- Type/negative: no TypeScript implementation changed.
- Manifest/report: authority refresh added as `out-of-scope`; no proof label
  changed.

Parent loops:

- Architecture: canonical authority now points at the locked external spec
  snapshot.
- Migration derivability: future migration/control-plane work should use the
  refreshed spec and section 29 stale-source handling.
- Adversarial evidence honesty: prior workstream proofs remain prior lab
  evidence, but any further promotion must re-check source wording against the
  refreshed spec.

## Final Output

Artifacts:

- `../../../docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `../../../../.gitattributes`
- `../proof-manifest.json`
- `../focus-log.md`
- `../dra-runtime-research-program-workflow.md`
- `../runtime-realization-research-program.md`
- `../effect-integration-map.md`

Verification run:

- `shasum -a 256` confirmed the repo spec, `/Users/mateicanavra/Downloads/...`,
  and `/Users/mateicanavra/Documents/projects/RAWR/assets/...` all match
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`.
- `bunx nx run runtime-realization-type-env:structural --skip-nx-cache`
  passed.
- `bunx nx run runtime-realization-type-env:report --skip-nx-cache` passed.
- `bunx nx run runtime-realization-type-env:gate --skip-nx-cache` passed.
- `bun run runtime-realization:type-env` passed.
- `git diff --check` passed after the narrow `.gitattributes` exception for
  the byte-exact canonical spec import.

Repo/Graphite state:

- `git status --short --branch`: clean on
  `codex/runtime-canonical-spec-refresh`.
- `gt status --short`: clean.
- `gt submit --stack --ai --publish --no-edit --no-interactive` created PR
  #269; Graphite mergeability check was in progress at the first post-submit
  poll.

## Next Workstream Packet

Resume:

- `Runtime Telemetry + HyperDX Observation`.

Required first reads after this branch:

- refreshed canonical spec section 22 telemetry/catalog/diagnostics;
- refreshed canonical spec section 23.3 telemetry;
- refreshed canonical spec section 29 lock authority and stale source handling;
- `2026-04-30-runtime-telemetry-hyperdx-observation.md` once restored on the
  child branch.

First commands:

```bash
git status --short --branch
gt status --short
bunx nx show project runtime-realization-type-env --json
shasum -a 256 docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md
```
