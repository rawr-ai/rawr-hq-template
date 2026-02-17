# SESSION_019c587a — Agent AC Inline-I/O Normalization Scratchpad

## Pass Summary
Completed a policy/spec-only normalization pass for inline I/O conventions across owned ORPC/Inngest posture packet docs.

Architecture and runtime posture were kept unchanged.

## Owned-File Resolution
1. `SESSION_019c587a_AGENT_AC_INLINE_IO_PLAN.md` was missing in this worktree and was created.
2. `SESSION_019c587a_AGENT_AC_INLINE_IO_SCRATCHPAD.md` was missing in this worktree and was created.

## Changes Applied

### `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
1. Added subsystem-wide invariants for inline-I/O default policy.
2. Added extraction-exception policy (shared/large readability cases only).
3. Added canonical extracted-shape policy (`{ input, output }`) and aligned naming-governance bullets.

### `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
1. Added packet cross-cutting defaults for inline-I/O baseline.
2. Added packet exception and paired-shape rules.
3. Added packet-wide snippet rules to avoid separate top-level input/output schema constants in extracted form.

### `orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
1. Added canonical policy bullets for inline-by-default, extraction exceptions, and paired extracted shape.
2. Added naming-default rule that extracted schemas should use `<Name>Schema.input` / `.output`.
3. Added default inline trigger-contract snippet.
4. Replaced split `Trigger*InputSchema` + `Trigger*OutputSchema` snippet with paired `TriggerInvoiceReconciliationSchema` object.

### `orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
1. Added context-axis guidance inheriting inline-I/O default plus extraction exception/paired-shape policy.

### `orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
1. Added middleware-axis guidance inheriting inline-I/O default plus extraction exception/paired-shape policy.

### `orpc-ingest-spec-packet/DECISIONS.md`
1. Updated current-status summary to include inline-I/O lock.
2. Added `D-012` as a locked decision for:
   - inline-I/O docs/examples default,
   - exception-only extraction policy,
   - paired extracted schema shape.

## Verification Notes
- Edited only owned files.
- Left unrelated working-tree edits untouched.
- No commit performed.
