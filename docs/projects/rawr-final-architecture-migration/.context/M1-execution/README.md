# M1 Execution Packet

This directory is the durable execution packet for Milestone 1. Treat it as a phase-scoped session packet, not as a dumping ground for every temporary note produced during execution.

## Live Packet

These are the files to reopen first when resuming Phase 1 work, auditing the plateau, or cloning the packet shape forward into another phase:

- `grounding.md`: milestone-level architectural truth and hard rails
- `workflow.md`: the execution loop and phase-scoped operating workflow
- `frame.md`: the stable high-level phase frame
- `context.md`: the hot current-state snapshot

## Historical Coordination

`handoffs/` contains historical takeover and peer-coordination artifacts that were load-bearing during execution but are not part of the live re-entry packet:

- orchestrator handoff
- mentor/peer context
- mentor heartbeat notes

Keep them because they preserve decision pressure and execution history that may still matter in later audits, but do not treat them as the first documents to reopen.

## Slice Notes

`notes/` contains slice-specific design and follow-up material that remains useful as retained provenance:

- issue-specific design packets
- follow-up investigations
- residual risk notes that are more specific than the live packet

If a note becomes durable phase truth, promote it into `grounding.md`, `workflow.md`, `frame.md`, `context.md`, the issue docs, or the milestone docs instead of letting the note become a hidden source of authority.

## Replicable Phase Shape

If the next phase gets its own execution packet, mirror this structure:

```text
P?-execution/
  README.md
  grounding.md
  workflow.md
  frame.md
  context.md
  handoffs/
  notes/
```

The invariant is simple:

- live packet files stay small, current, and authoritative
- historical coordination artifacts stay preserved but out of the active lane
- slice notes stay available without being mistaken for the active packet
