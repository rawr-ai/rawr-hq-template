---
name: workstream-review-loops
description: Use when designing or running workstream review loops, choosing review lanes, capturing findings, dispositioning accepted/rejected/waived work, and turning review results into repair demands or Next Packet entries.
---

# Workstream Review Loops

Use this skill when a workstream needs review without coverage theater. Review
loops protect execution mechanics, proof boundaries, repair quality, and
closure.

## Rules

- Pick review axes from the workstream's risks.
- Each lane needs a named concern, evidence base, forbidden scope, and required
  output.
- Evidence can inform a finding without satisfying it. Generated summaries,
  dashboards, browser output, eval scores, customer feedback, and external
  reports need provenance and trust limits.
- Review agents produce findings. The DRA owns disposition.
- Findings without disposition are unfinished work.
- Accepted findings must be repaired or consciously waived.
- Rejected findings need reasons.
- Waived findings need reason, risk, owner/future DRA, and re-entry trigger.
- Invalidated findings need the later evidence that changed their status.
- Repair demands must name the artifact, evidence, expected change, and whether
  they block closure.
- Review loops are internal workstream mechanics, not programs or subordinate
  workstreams.
- Output contracts can be non-code. Decisions, plans, spikes, review packets,
  experiment results, and handoff artifacts are legitimate workstream outputs.

## Lane Menu

Use the smallest set that covers the risk:

- Opening mechanics: objective, boundary, authority order, selected
  capabilities, and stop conditions.
- Information shape: whether a future DRA can resume quickly.
- Canonicality boundary: whether stable mechanics are separated from
  subject-specific material.
- Proof ledger: claim strength, evidence homes, waivers, deferred inventory,
  and promotion boundaries.
- Integration state: whether artifacts, checks, repo state, and Graphite state
  agree.
- Closure readiness: whether final output, review disposition, deferred
  inventory, and Next Packet are usable.

## Finding Format

Use `assets/finding-record.md` for every material finding.

Severity:

- `P1`: blocks closure or would materially mislead the next DRA.
- `P2`: important gap that should be repaired, waived, or deferred.
- `P3`: nonblocking cleanup or improvement.

Disposition:

- `accepted`: the DRA agrees and work changes.
- `rejected`: the DRA disagrees and records why.
- `invalidated`: later evidence made the finding false.
- `waived`: risk is real but consciously accepted.
- `deferred`: valid work moves to deferred inventory.

## Run Order

1. Run leaf review loops on bounded outputs.
2. Repair accepted leaf findings before composed synthesis unless waived.
3. Run composed loops on the integrated state.
4. Re-run only lanes affected by repair.
5. Close only when no accepted P1/P2 finding remains unrepaired.

## Closure Check

Before closure, verify:

- no finding lacks disposition;
- no accepted finding lacks repair or waiver;
- no waived finding lacks risk and trigger;
- no deferred finding lacks enough context for the Next Packet;
- review results did not introduce subject-specific rules into the generic
  workstream layer.

Ask the user only for real design decisions: architecture, public interface,
ownership topology, irreversible migration/sequence changes, or authority
conflicts the DRA cannot resolve from sources. Routine implementation details,
honestly fenced residuals, and mechanical cleanup remain DRA-owned.
