---
name: workstream-review-loops
description: Use when designing or running workstream review loops. This skill helps choose non-generic review lanes, capture findings, disposition accepted/rejected/waived work, and turn review results into repair demands or next-packet entries.
---

# Workstream Review Loops

Use this skill when a workstream needs review without generic review theater. A review loop exists to protect the workstream's coordination mechanics, proof boundaries, and closure quality.

## Review Loop Rules

- Pick review axes from the workstream's risks, not from generic agent labels.
- Each lane must have a named concern, evidence base, forbidden scope, and required output.
- The DRA owns disposition. Review agents produce findings, not final calls.
- Findings without disposition are unfinished work.
- Waived findings are still ledger entries with reason, risk, and next trigger.
- Rejected findings need a reason so they do not come back as stale noise.

## Choose Lanes

Start with the smallest set that covers the real risk.

Use these lane types when they match the workstream:
- Opening mechanics: objective, boundary, authority order, selected skills, and stop conditions.
- Information shape: whether the workstream can be read and resumed quickly.
- Canonicality boundary: whether stable mechanics are separated from high-variance subject matter.
- Proof ledger: claim strength, evidence homes, waivers, deferred work, and promotion boundaries.
- Integration state: whether produced artifacts, checks, repo state, and Graphite state agree.
- Closure readiness: whether a zero-context next packet exists and is usable.

Do not create a lane named only `reviewer`, `explorer`, or `auditor`. If a role could use that generic name, tighten the concern until it is workstream-specific.

## Finding Format

Record every finding in this shape:

```text
Finding:
Evidence:
Disposition: accepted | rejected | invalidated | waived | deferred
Confidence:
Repair demand:
Next-packet consequence:
```

Definitions:
- `accepted`: the DRA agrees and work must change.
- `rejected`: the DRA disagrees; record why.
- `invalidated`: later evidence made the finding no longer true.
- `waived`: the finding is real but consciously not fixed now; record risk and trigger.
- `deferred`: the finding remains unresolved and moves to deferred inventory.

## Run Order

1. Run leaf review loops on bounded lane outputs before composing them.
2. Repair accepted leaf findings before parent synthesis unless the DRA records a deliberate waiver.
3. Run parent review loops on the composed workstream state.
4. Re-run only the lanes affected by repair. Do not restart all review work by default.
5. Before closure, make sure every finding has disposition and every repair demand is either satisfied, waived, or deferred.

## Repair Demands

A repair demand must be concrete enough to execute:
- what file, artifact, claim, section, gate, or branch state is wrong;
- what evidence shows the gap;
- what change would satisfy it;
- whether it blocks closure.

Avoid vague repair demands such as "improve clarity" or "review this more." Translate them into a concrete workstream mechanic.

## Waivers And Deferrals

Use a waiver when the risk is known and intentionally accepted for this workstream. Use a deferral when the work remains valid but belongs to a later workstream.

Every waiver or deferral needs:
- reason;
- risk;
- owner or future DRA;
- trigger for reopening;
- evidence needed to resolve it.

## Closure Check

Before the DRA closes the workstream, verify:
- no finding lacks disposition;
- no accepted finding lacks repair or explicit waiver;
- no waived finding lacks risk and trigger;
- no deferred finding lacks enough context for the next packet;
- review results did not introduce subject-specific rules into the generic workstream layer.
