---
name: reflect
description: |
  Canonical guidance for agent reflection using the repo-local journaling system. Use this to capture durable workflow and collaboration insights (not temporal project logs), especially at workflow boundaries.
---

# Reflect — Canonical Skill

## Subject and scope

This skill defines how agents should practice reflection using the existing journaling substrate in RAWR HQ.

Important distinction:
- `journal` is the internal storage/retrieval mechanism.
- `reflect` is the agent-facing practice of extracting reusable workflow and collaboration insight.

Out of scope:
- one-off project details
- bug-specific logs
- undocumented or unapproved policy changes
- any not-yet-implemented journal features

## Version + date context

- **Date context:** 2026-02-05
- **Implementation basis:** current behavior in:
  - `apps/cli/src/index.ts`
  - `apps/cli/src/commands/journal/search.ts`
  - `apps/cli/src/commands/journal/tail.ts`
  - `apps/cli/src/commands/journal/show.ts`
  - `apps/cli/src/commands/reflect.ts`
  - `packages/journal/src/*`

## Core mental model

1. The CLI writes journal events and command snippets automatically on each invocation (best effort).
2. Reflection is built from small, atomic journal retrieval (`tail/search/show`) plus synthesis.
3. What gets retained as reflection must be generalizable workflow knowledge, not temporal details.
4. Reflection should help future agents coordinate and execute multi-step work more reliably.

## When to use this skill

- During longer workflows when emerging patterns or traps become visible.
- At the end of successful multi-step workflows.
- During handoff preparation, when you need to extract durable collaboration norms.

## Reflection protocol

1. Gather evidence from journal snippets:
   - `rawr journal tail --limit <n>`
   - `rawr journal search --query <q> --limit <n>`
   - `rawr journal show <id>`
2. Identify repeated patterns:
   - sequence patterns
   - invariants
   - traps/pitfalls
   - collaboration cues for multi-agent work
3. Apply canonical filter:
   - keep only reusable, cross-session guidance
   - remove temporal/scope-bound specifics
4. Record reflection in durable written form (handoff/spec/skill context), never as hidden policy.

## Current command surface

- `rawr journal tail`
- `rawr journal search`
- `rawr journal show`
- `rawr reflect`

## Boundaries and deep references

- Boundaries: `references/boundaries.md`
- Trigger timing: `references/triggers-and-timing.md`
- Implemented mechanics and evidence: `references/current-surface.md`

## Summary

- Use journal data as evidence.
- Preserve only durable workflow/collaboration insight.
- Keep reflection explicit, reviewable, and policy-safe.
- Prefer small atomic retrieval and clear synthesis over broad logging.
