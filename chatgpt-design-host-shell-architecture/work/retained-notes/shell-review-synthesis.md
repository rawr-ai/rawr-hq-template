# Shell Second-Pass Investigation Synthesis

## Settled and adequately represented

- Workflow boundary law is settled at shell level:
  - exposure authority and execution authority are distinct
  - exposure belongs on the boundary / `server` side
  - durable execution belongs on the `async` side
  - packaging remains intentionally open below shell level
  - Source: `shell-second-pass-workflow-investigator.md`
  - Disposition: no shell law change required

- Host bundle composition authority is settled as shell law:
  - `apps/` are hosts
  - `rawr.hq.ts` is app-internal composition authority
  - one composition authority may back one or more peer runtime roles
  - Source: `shell-second-pass-host-bundle-investigator.md`
  - Disposition: no doctrinal change required

## Settled but underrepresented

- Plugin meaning is settled, but the shell’s repo illustration is too concrete:
  - `plugin` is runtime projection / adaptation, not semantic truth
  - current `plugins/server|async|web/*` example reads like locked filesystem law
  - Source: `shell-second-pass-plugin-taxonomy-investigator.md`
  - Recommended action: replace illustration with a more generic semantic plugin tree

- Host bundle composition authority is visually underrepresented:
  - current diagram lets `rawr.hq.ts` feel slightly free-floating
  - stronger scene should place `rawr.hq.ts` clearly inside `apps/<host>/`
  - Source: `shell-second-pass-host-bundle-investigator.md`
  - Recommended action: replace illustration

- Runtime topology / scale continuity is underrepresented:
  - prose is mostly right
  - diagrams do not fully carry shared-host -> split-role -> promoted-bundle continuity
  - Source: `shell-second-pass-runtime-topology-investigator.md`
  - Recommended action: replace scale/topology illustration with a three-scene continuity diagram

- Ontology is correct, but still slightly too easy to misread as folder taxonomy:
  - Source: `shell-second-pass-representation-integrator.md`
  - Recommended action: tighten wording around minimal repo topology

- Stewardship / agent-host placement is correct, but the overlay relationship is still lighter than ideal:
  - Source: `shell-second-pass-representation-integrator.md`
  - Recommended action: strengthen the stewardship illustration/caption

- Supporting-doc authority boundaries are correct but still slightly late/inferential:
  - Source: `shell-second-pass-representation-integrator.md`
  - Recommended action: add a short early boundary-routing statement in `What This Shell Is`

## Actually unresolved and needing explicit shell restraint

- Plugin subtree taxonomy is not fully locked:
  - runtime-role-first tree may still become the default
  - current packet does not support presenting it as already-settled shell law
  - Source: `shell-second-pass-plugin-taxonomy-investigator.md`
  - Shell implication: keep plugin meaning, soften taxonomy illustration

- Workflow packaging shape remains intentionally open:
  - dual-surface workflow package is canonical at workflow-doc level
  - shell should not force one-plugin vs two-plugin packaging
  - Source: `shell-second-pass-workflow-investigator.md`
  - Shell implication: preserve responsibility split, avoid stronger packaging claims

## Ranked shell changes

1. Replace the minimal repo topology illustration so `plugins/` is shown generically rather than as an already-locked runtime-role-first subtree.
2. Replace the host-bundle scene so `rawr.hq.ts` is visibly inside `apps/<host>/` as app-internal composition authority.
3. Replace the topology/scale illustration with a three-scene continuity diagram: shared host, split peer roles, promoted peer bundles.
4. Add one short wording reinforcement that the repo tree is the shallowest repo-shaped rendering of the ontology, not folder law.
5. Add one short wording reinforcement that workflow responsibility split is locked while packaging remains below shell level.
6. Strengthen the stewardship overlay illustration/caption so it more clearly reads as ownership layered over existing bounded areas.
7. Add a short early routing statement in `What This Shell Is` clarifying shell vs supporting-doc authority.

## No-change conclusions

- Do not reopen the shell’s workflow boundary law.
- Do not promote a single workflow packaging shape into shell law.
- Do not reintroduce detailed plugin subtree law.
- Do not reopen host bundle composition authority as a doctrinal question.

## Net result

The second-pass team did not find a large hidden architecture miss in the shell.

The main findings are:

- one real shell-restraint issue: plugin taxonomy / workflow packaging should remain softer than the current shell sometimes implies
- several representation-quality upgrades that would make the existing shell much stronger without changing its core doctrine
