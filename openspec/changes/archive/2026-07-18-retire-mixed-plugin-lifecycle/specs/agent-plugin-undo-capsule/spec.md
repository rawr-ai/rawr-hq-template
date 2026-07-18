## RENAMED Requirements

- FROM: `### Requirement: Undo contract remains inactive in C2`
- TO: `### Requirement: Operator undo is qualified and controller-owned`

## MODIFIED Requirements

### Requirement: Operator undo is qualified and controller-owned
The controller-owned bounded last-operation capsule MUST be operator-reachable only as `rawr agent plugins undo`. Root `rawr undo`, mixed lifecycle undo, workspace-local capsules, aliases, forwarding routes, universal pre-dispatch expiry, and service-local undo stores MUST be absent. The qualified command MUST invoke only the controller-owned undo application, which dispatches replay through the capsule's registered owner protocol and MUST NOT scan source workspaces, app composition, provider homes, destinations, or Oclif state for recovery authority.

#### Scenario: Empty qualified undo is read-only
- **WHEN** no valid last-operation capsule exists
- **THEN** `rawr agent plugins undo` reports the exact empty classification without creating, replacing, expiring, or clearing capsule state
- **AND** root `rawr undo` is undiscoverable

#### Scenario: Qualified replay uses the registered owner only
- **WHEN** a valid export or provider capsule is replayed
- **THEN** the controller dispatches only the action's registered owner codec and verifies exact prior state before clearing the capsule
- **AND** no generic filesystem cleanup, aggregate service, or foreign state owner is invoked
