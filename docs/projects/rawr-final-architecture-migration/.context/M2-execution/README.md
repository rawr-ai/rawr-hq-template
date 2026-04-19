# P2 Execution Packet

This directory is the durable execution packet for Phase 2 of the architecture migration. Treat it as the live Phase 2 session packet, not as an extension of the closed M1 packet.

## Live Packet

These are the files to reopen first when starting or resuming Phase 2 work:

- `grounding.md`: phase-level architectural truth and hard rails
- `workflow.md`: the execution loop and phase-scoped operating workflow
- `frame.md`: the stable high-level Phase 2 frame
- `context.md`: the hot current-state snapshot

## Historical Coordination

`handoffs/` is reserved for takeover and peer-coordination artifacts that become useful during Phase 2 execution but should not live in the first-hop lane.

If a handoff becomes durable phase truth, promote it into the live packet or the migration docs instead of leaving it hidden in `handoffs/`.

## Notes

`notes/` holds retained Phase 2 investigations, slice notes, and carry-forward risks that matter but are more specific than the live packet.

The first retained note in this packet is the carried-forward HQ Ops runtime-verification risk from Phase 1.

## Starting Posture

Phase 2 does not begin from a cleanup swamp. It begins from a frozen Phase 1 plateau:

- `services/hq-ops` is already the canonical HQ operational authority
- `apps/hq` is already the canonical shell
- `apps/hq/legacy-cutover.ts` is the only allowed executable bridge that may cross the boundary

The first deliberate Phase 2 move is to replace that bridge with the canonical runtime path.
