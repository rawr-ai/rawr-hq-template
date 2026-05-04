# Lane 1.1 Patch — Rec #1 Lifecycle Scope Rewrite

## Sub-edit 1.1.A — §1 lifecycle bullet

**Source:** alignment plan §4 Rec #1, target arch-spec L18 (current numbering; plan cites L17).

### BEFORE (must match exactly, copy-paste from spec):
- the runtime realization lifecycle;

### AFTER:
- the canonical lifecycle phase vocabulary and integration-boundary handoffs for runtime realization (definition → selection → derivation → compilation → provisioning → mounting → observation); phase mechanics, sub-sequencing, artifact shapes, and substrate internals are defined in the canonical runtime realization specification (RAWR_Effect_Runtime_Realization_System_Canonical_Spec);

## Sub-edit 1.1.B — §1 substrate bullet

**Source:** alignment plan §4 Rec #1, target arch-spec L19 (current numbering; plan cites L18).

### BEFORE (must match exactly, copy-paste from spec):
- the process-local runtime substrate;

### AFTER:
- the canonical name and ownership split of the process-local runtime substrate (RAWR plans identity, order, dependency, lifetime, and boundary policy; Effect executes scoped acquisition, release, runtime ownership, and process-local coordination); substrate internals, named coordination resources, and kernel mechanics are defined in the canonical runtime realization specification;

## Sub-edit 1.1.C — Add §4.3a carve-out paragraph

**Source:** alignment plan §4 Rec #1 companion edit, target arch-spec L477–L479 (closing paragraph of §4.3 + blank line + §4.4 heading).

### BEFORE (must match exactly, copy-paste from spec):
Bootgraph, provisioning, process runtime, adapters, harnesses, and diagnostics bridge the semantic shell to running software. They are not additional top-level semantic layers.

### 4.4 Service boundary first

### AFTER:
Bootgraph, provisioning, process runtime, adapters, harnesses, and diagnostics bridge the semantic shell to running software. They are not additional top-level semantic layers.

### 4.3a Names-versus-mechanics carve-out

The canonical architecture specification owns the durable integration vocabulary for runtime realization: the lifecycle phase names, the canonical RAWR-vs-Effect control split, the role and surface taxonomy, and the producer/consumer handoff contract at each phase boundary. It does not own the mechanics within each phase — phase implementation, sub-sequencing, artifact type shapes, named substrate primitives, and kernel internals are owned by the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`). When a companion subsystem specification needs to understand what a lifecycle phase does, the arch-spec provides the boundary vocabulary; the runtime spec provides the contract. A change to mechanics within a phase does not require updating the arch-spec; a change to phase names, their order, or their integration handoffs requires updating both specifications in concert.

### 4.4 Service boundary first
