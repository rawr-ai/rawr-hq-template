# Canonical Expansion Navigation

## Document Role
This file is a concern-based navigation index for expansion additions. It does not define policy; it routes readers to canonical authorities.

## Authority Split
- **Normative integrative policy:** `ARCHITECTURE.md`
- **Normative decision authority:** `DECISIONS.md`
- **Normative leaf policy:** `axes/*.md`
- **Reference walkthroughs (non-normative):** `examples/*.md`
- **Implementation-adjacent downstream update contract:** `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

## Concern Router
| Concern | Primary canonical source | Secondary supporting source | Artifact class |
| --- | --- | --- | --- |
| D-013 legacy metadata runtime simplification | `axes/10-legacy-metadata-and-lifecycle-simplification.md` | `DECISIONS.md` (`D-013`) | normative policy |
| D-014 core infrastructure packaging/composition guarantees | `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` | `axes/02-internal-clients.md`, `axes/07-host-composition.md`, `axes/08-workflow-api-boundaries.md` | normative policy |
| D-015 testing harness model | `axes/12-testing-harness-and-verification-strategy.md` | `axes/05-errors-observability.md`, `axes/06-middleware.md`, `examples/e2e-04-context-middleware.md` | normative policy + reference |
| Downstream docs/runbook/testing update execution rules | `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` | `axes/12-testing-harness-and-verification-strategy.md` | implementation-adjacent contract |
| Caller/auth canonical matrix | `ARCHITECTURE.md` | axis/example matrix views are contextual only | normative integrative policy |

## Fast Read Paths
1. **Need locked architecture posture first:** read `ARCHITECTURE.md`, then `DECISIONS.md`.
2. **Need D-013 details:** read `axes/10-legacy-metadata-and-lifecycle-simplification.md`, then `DECISIONS.md`.
3. **Need D-014 infrastructure seam contract:** read `axes/11-core-infrastructure-packaging-and-composition-guarantees.md`, then `axes/07-host-composition.md`.
4. **Need D-015 testing model and downstream rollout contract:** read `axes/12-testing-harness-and-verification-strategy.md`, then `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`.

## No-Drift Note
This index is structural only and preserves existing policy authority boundaries.
