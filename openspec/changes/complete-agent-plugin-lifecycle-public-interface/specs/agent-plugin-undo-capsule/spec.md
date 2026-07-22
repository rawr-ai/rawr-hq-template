## REMOVED Requirements

### Requirement: Controller-owned one-state capsule
**Reason**: Provider recovery already converges from live native truth, and managed export leaves the curated lifecycle controller.
**Migration**: Remove the capsule from controller, service, CLI, and package reachability after the installed capsule root is inspected read-only.

### Requirement: Owners emit typed exact inverse actions
**Reason**: No remaining lifecycle operation emits an inverse action.
**Migration**: Provider operations report exact applied prefixes and retry from live state; destination rollback transfers with destination realization.

### Requirement: Later mutation replaces earlier mutation
**Reason**: There is no remaining lifecycle capsule slot whose authority can be replaced.
**Migration**: Each remaining owner uses its current truthful state rather than a cross-operation rollback record.

### Requirement: Undo failure is retryable and success clears
**Reason**: `rawr agent plugins undo` and its replay executor are retired.
**Migration**: Provider retry is ordinary reinspection and convergence. Future destination rollback, if any, belongs to the dedicated architecture.

### Requirement: Capsule protocol is hard bounded before mutation
**Reason**: The capsule protocol is removed instead of broadened or retained as dormant compatibility machinery.
**Migration**: No stub, decoder, writer, fallback, or alias remains reachable.

### Requirement: Capsule storage is atomic and path-safe
**Reason**: No lifecycle operation persists capsule state after this cut.
**Migration**: Do not create a replacement store or shared native primitive.

### Requirement: Capsule has no history or cleanup authority
**Reason**: The stronger corrected boundary is no lifecycle capsule authority at all.
**Migration**: Remove the capsule implementation and state model, and leave cleanup authority with each surviving state owner.

### Requirement: Undo results mirror persisted state
**Reason**: There is no persisted capsule state or undo result surface to project.
**Migration**: Remove the public TypeBox result and CLI exit mapping with the command.

### Requirement: Provider inverse actions use the existing controller capsule
**Reason**: Provider lifecycle is forward-only native convergence from live state.
**Migration**: Preserve exact applied-prefix outcomes and fresh-read retry.

### Requirement: Provider actions bind exact target and receipt truth
**Reason**: Provider actions no longer enter rollback authority.
**Migration**: Targeted and complete-test receipts remain mode-local observations; canonical ownership uses native marketplace identity and embedded provenance.

### Requirement: Partial multi-target application retains complete inverse coverage
**Reason**: Partial truth is represented by per-target outcomes, not a controller rollback transaction.
**Migration**: Preserve successful targets and retry failed targets from fresh native observation.

### Requirement: Provider replay is owner-specific and receipt-bounded
**Reason**: Provider replay is removed with capsule production.
**Migration**: Recovery is ordinary point-addressed native convergence.

### Requirement: Provider failpoints preserve controller recovery truth
**Reason**: Controller recovery truth is a second provider-state authority.
**Migration**: Failures retain the exact observed/applied prefix; retry re-inventories live state.

### Requirement: Operator undo is qualified and controller-owned
**Reason**: No lifecycle mutation requires operator rollback after managed export retirement.
**Migration**: Remove `rawr agent plugins undo`, root and nested aliases, service-runtime replay, and command/help/manifest discovery.
