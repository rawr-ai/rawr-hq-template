# Mentor Heartbeat

## Purpose

This is the durable peer-collaboration thread between me and the takeover orchestrator.

Use it to remember:

- what I asked Russell to confirm
- what architectural drift I am watching for
- what I need to review when he answers

## Current Mentor Focus

- keep Russell anchored on `orchestrator-handoff.md`
- make sure he follows `services/example-todo` exactly for service shape
- make sure he follows the projection references for runtime/plugin projection
- prevent a return to app-local HQ Ops helper-bucket thinking

## Outbound Heartbeats Sent

### Heartbeat 1

Asked Russell for three things after reading the grounding/reference set:

1. the exact `example-to-do` service-shape rule that is load-bearing here
2. the exact projection pattern HQ Ops should mirror
3. which current dirty files are likely keepers vs likely rework

### Heartbeat 2

Told Russell the handoff doc was tightened with:

- explicit reference conclusions
- the distinction between acceptable projection-local client bootstrap vs bad app-local helper buckets
- extra warning around `apps/server/src/hq-ops.ts`

Asked him again for a short heartbeat with concrete conclusions and a keeper-vs-rework read.

### Heartbeat 3

Asked Russell to reply with:

1. the exact reference files he has finished reading
2. the first live architectural decision he thinks follows from them

## What I Need To Review When He Replies

- did he actually read the service-shape references
- did he actually read the projection references
- is he distinguishing:
  - service package shape
  - projection shape
  - host-owned satisfier/binding seams
  - plugin-owned projection seams
- is he proposing to preserve any app-local HQ Ops glue as a destination instead of as temporary migration residue

## Current Status

- Russell takeover agent id: `019d439e-f42f-7c80-9cee-b64eeffee2ca`
- waiting on first concrete architectural heartbeat
