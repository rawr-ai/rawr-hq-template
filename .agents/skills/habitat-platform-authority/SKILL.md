---
name: habitat-platform-authority
description: Route Habitat platform decisions when asked where a change belongs, which authority wins, how the runtime spine realizes an app, whether a consumer pattern may be lifted, which Habitat role should act, or which vendor skill or steward to load. Navigation only; never semantic authority.
---

# Habitat Platform Authority Router

Use this skill to reach the owner and current authority before designing or
implementing Habitat platform work. It is a decision router, not a source of
architecture, runtime, vendor, package-version, or release truth.

## First Route

1. Resolve the repository boundary through [the repository router](../../../AGENTS.md)
   and [the Habitat/Rawr/Marketplace split](../../../AGENTS_SPLIT.md).
2. Use [the Nx agent workflow](../../../docs/process/NX_AGENT_WORKFLOW.md) and
   `bunx nx show project <project-name> --json` for workspace and project truth.
3. Read [the canonical architecture](../../../docs/system/HABITAT_ARCHITECTURE.md),
   [runtime realization](../../../docs/system/HABITAT_RUNTIME_REALIZATION.md),
   [Habitat authority](../../../.habitat/AUTHORITY.md), and
   [authority ontology](../../../.habitat/AUTHORITY-ONTOLOGY.md) for the affected
   boundary.
4. Read the active
   [runtime-spine authority amendment](../../../openspec/changes/realize-app-runtime-spine/authority-amendment.md),
   [design](../../../openspec/changes/realize-app-runtime-spine/design.md), and
   [tasks](../../../openspec/changes/realize-app-runtime-spine/tasks.md) when the
   work participates in that change.

## Authority Order

On conflict, apply this order:

1. Current explicit owner intent for the task, within the repository boundary.
2. Repository-local canonical architecture, runtime realization, and Habitat
   authority/ontology, read with explicit section-level amendments.
3. The active OpenSpec for those named amendments and execution sequencing;
   never as a whole-file replacement.
4. Pinned installed vendor source for exact mechanics.
5. Current code and tests as implementation evidence.
6. Consumer repositories and dated external documents as directional evidence
   only.

Do not copy package versions, hashes, vendor algorithms, or specification text
into this skill. Follow its links so those facts keep one owner.

## Decision Keys

- **Owner split:** reusable platform machinery and law belong to Habitat;
  downstream domain behavior and app composition belong to Rawr; curated
  agent-plugin content and governance belong to Marketplace. Cross only through
  versioned data or ordinary released package interfaces.
- **Realization spine:** `definition -> selection -> derivation -> compilation
  -> provisioning -> mounting -> observation`.
- **Consumer proto-lift:** trace the exact behavior oracle, map it to a named
  Habitat owner and active task, freeze only generic assertions, re-author under
  Habitat law and pinned vendor idioms, prove and release the Habitat artifact,
  migrate the consumer, then remove only the superseded prototype. Never lift
  product wiring, product policy, helper topology, or an unimplemented adapter
  claim.

## Role And Skill Routing

- Route uncertain kinds, layers, relationships, rule scope, or destination
  shapes to `habitat-designer` before implementation.
- Route an accepted blueprint slice, root-topology migration, or known
  structural violation burn-down to `habitat-engineer`.
- Load vendor skills only for the concrete vendor boundary in the current
  task. They refine mechanics but cannot redefine Habitat owners, ontology, or
  lifecycle.
- Select lifecycle and workstream stewards only for the task-scoped process
  they own. Do not turn a vendor skill or steward into standing semantic
  authority.

If the owner or authority still conflicts after following the chain, stop at
the conflicting claims and ask for an owner decision rather than inventing a
hybrid.
