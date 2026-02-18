# ORPC/Inngest Packet Canonical Role Contract

## Role Metadata
- Role: Normative Core
- Authority: Defines role taxonomy and ownership boundaries for this packet.
- Owns: role definitions, required metadata fields, and file-level role assignments.
- Depends on: `./ORPC_INGEST_SPEC_PACKET.md`, `./DECISIONS.md`.
- Last validated against: `../SESSION_019c587a_INFO_DESIGN_CONVERGED_DIRECTION.md`.

## Purpose
Lock one role taxonomy so policy ownership, examples, and session history cannot compete for authority.

## Required Role Metadata Block
Every packet artifact should declare this block near the top of the file:
1. `Role`
2. `Authority`
3. `Owns`
4. `Depends on`
5. `Last validated against`

## Role Taxonomy
| Role | Authority level | Owns | Must not own |
| --- | --- | --- | --- |
| Normative Core | Highest | packet-wide invariants, caller/auth matrix, canonical entry/read contracts, decision ledger | tutorial-first walkthrough ownership, mirrored global policy in other roles |
| Normative Annex | Binding inside delegated axis scope | axis-specific deltas, constraints, edge semantics | packet-wide invariants, packet-wide caller matrix |
| Reference | Non-normative by default | integrative explanations, implementation walkthroughs, examples | independent policy ownership |
| Historical/Provenance | Record only | plans, reviews, scratchpads, changelogs, lineage evidence | current normative policy authority |

## File Role Assignments
| Artifact | Role | Authority note |
| --- | --- | --- |
| `./ORPC_INGEST_SPEC_PACKET.md` | Normative Core | Sole canonical read entrypoint and global-policy owner |
| `./DECISIONS.md` | Normative Core | Canonical decision-state ledger |
| `./AXIS_01_EXTERNAL_CLIENT_GENERATION.md` through `./AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md` | Normative Annex | Axis-local policy only; references core for globals |
| `./examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` through `./examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` | Reference | Illustrative implementations; non-normative unless explicitly citing owners |
| `../SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` | Reference | Integrative overview; not a competing policy root |
| `../SESSION_019c587a_*` planning/review/scratch/changelog artifacts | Historical/Provenance | Operational record only |

## Ownership Rules
1. Packet-global invariants and caller/auth matrix are owned once in `./ORPC_INGEST_SPEC_PACKET.md`.
2. Decision status and closure/open state are owned once in `./DECISIONS.md`.
3. Annexes and references may cite core policy but do not restate ownership.
4. Historical artifacts must never be required to interpret canonical policy.
