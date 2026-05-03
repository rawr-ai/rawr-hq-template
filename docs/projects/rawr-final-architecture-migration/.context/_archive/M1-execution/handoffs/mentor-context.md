# Mentor Context

## Role

I am no longer the orchestrator for this repair.

My role now is:

- peer mentor to the takeover agent
- boundary guard
- architecture-reference reminder
- fast reviewer of proposed direction and diffs
- continuity keeper while the user is away

I am not supposed to resume independent implementation unless the takeover agent explicitly asks for a narrowly scoped assist and that assist does not undermine their ownership.

## Current Takeover

- Takeover agent nickname: `Russell`
- Takeover agent id: `019d439e-f42f-7c80-9cee-b64eeffee2ca`
- Authoritative handoff doc:
  - `/Users/mateicanavra/conductor/workspaces/rawr-hq-template/guangzhou/docs/projects/rawr-final-architecture-migration/.context/M1-execution/handoffs/orchestrator-handoff.md`

## Mission I Am Supporting

Help Russell finish the HQ Ops service-shape repair correctly:

- `services/hq-ops` must match `services/example-todo` in service shape
- business capability must live in service modules
- capability must be projected properly into runtime/plugin surfaces
- embedded app-local HQ Ops glue must not become the long-term architecture

## The Most Important Correction

The prior repair frame was wrong.

Wrong frame:

- “consumer clusters”
- “local HQ Ops client helpers” as the main repair strategy
- treating app-local helper seams as the intended end state

Correct frame:

- centralize capability in the service
- use `example-to-do` exactly
- project capability into the appropriate plugin/runtime surfaces
- remove package-style capability exports and imports

## What I Need To Keep Doing

- keep Russell grounded in:
  - `grounding.md`
  - `workflow.md`
  - the canonical architecture spec
  - `guidance.md`
  - `DECISIONS.md`
  - `services/example-todo`
  - the plugin/server/CLI projection references listed in `orchestrator-handoff.md`
- prevent drift back into helper-bucket thinking
- ask Russell for short heartbeat updates rather than disappearing for long stretches
- review his plan and code from architecture downward, not just from “does it compile”
- keep the collaboration friendly and peer-like, not directive for its own sake

## Collaboration Loop

Use a lightweight repeating loop with Russell:

1. Ask what he concluded from the reference model.
2. Ask what specific shape change he is making next.
3. Review that direction for boundary drift before or immediately after he edits.
4. Ask for the next short checkpoint rather than a large silent block.

## Do Not Forget

- single worktree
- Graphite-first workflow
- the working tree is currently dirty on `agent-FARGO-M1-U02-followup-hq-ops-service-shape`
- do not leave the repo in a dirty half-state at the end of a true stopping point
- before any eventual commit that changes runtime behavior, HQ stack validation must run with observability required

## Immediate Focus

My immediate focus is not code. It is keeping Russell oriented:

- confirm he has read the handoff and reference set
- confirm he understands the difference between service shape and projection shape
- keep him from inheriting my wrong helper-oriented repair frame
