# SESSION_019c587a — ORPC Contract-First vs Router-First Deep Dive (Orchestrator Scratchpad)

## Objective
Evaluate contract-first vs router-first in our current architecture, strictly within the accepted posture spec, without destabilizing split harness policy (oRPC boundary + Inngest durability).

## Guardrails
1. Anchor to current posture spec as source of policy truth.
2. No recommendations that silently undo locked boundaries.
3. Official docs-first before conclusions.
4. Each agent keeps plan + scratchpad + final recommendation.

## Agent Tracks
- Agent L: contract-first focused (hybrid considered).
- Agent M: router-first focused (hybrid considered).

## Required Questions
1. Pure/internal package authoring: contract+router split value vs overhead.
2. API plugin authoring: contract-first vs router-first ergonomics and scale patterns.
3. Workflow plugin authoring: contract-first value vs router-first clarity.
4. Where contract-first actually provides net benefit in our architecture.
5. Clarify canonical definitions for contract-first, router-first, and deliberate hybrid in our context.

## Outputs to collect
- Agent L recommendation doc
- Agent M recommendation doc
- Integrated recommendation from orchestrator

## Pending integration reminder
- Keep tracking review-only artifacts not yet back-ported into canonical E2E doc.
