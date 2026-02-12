# Policy Classification Vocabulary

> **Related**: `lifecycle-contract.md`, `judge-template-pass-a.md`, `judge-template-pass-b.md`

## Purpose

Define strict policy classification semantics for merge automation.

## Core Terms

### No-policy change
A change that improves quality, clarity, robustness, reliability, maintainability, or test/doc quality **without** changing behavior or policy intent.

Typical examples:
- refactors preserving outputs/contracts,
- tighter typing without contract change,
- readability/comments,
- test additions/fixes,
- docs clarifications,
- non-functional cleanup.

### Policy change
A change that introduces or alters behavior intent, risk posture, user-visible semantics, permission decisions, gating, merge rules, or operational policy.

Typical examples:
- changing default flags/behaviors,
- altering security/risk decisions,
- changing command contracts/output semantics,
- changing merge/approval criteria,
- changing compatibility boundaries.

## Judge Outcomes

Allowed outcomes:
- `auto_merge`
- `fix_first`
- `policy_escalation`
- `insufficient_confidence`

### Outcome Semantics

- `auto_merge`: strict no-policy + lifecycle quality pass + no unresolved comment risk.
- `fix_first`: no-policy intent may hold, but correctness/quality blockers must be fixed first.
- `policy_escalation`: policy/behavior implication detected; human or human+agent review required.
- `insufficient_confidence`: evidence is too weak/ambiguous for safe auto-merge.

## Two-Pass Judge Rule

Two independent judges run after publish and comment wait window.

Consensus rules:
- both `auto_merge` => eligible to auto-merge
- any `policy_escalation` => escalation hold
- any `fix_first` => fix-first hold
- disagreement or low confidence => hold (`insufficient_confidence`)

## Current vs Future Classification Engine

### Current engine
- LLM-as-judge (two independent passes)
- input: stack diff, PR context/comments, lifecycle result, this vocabulary

### Future engine (target)
- deterministic policy blocks
- deterministic policy diffing between baseline and proposed state
- deterministic merge gate from explicit policy deltas

This future target is mandatory direction and should replace LLM primary judgment once policy blocks are in place.
