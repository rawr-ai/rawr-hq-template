# SPIKE (Parked): LLM risk judge for plugin enablement

Status: **PARKED** — doc only. Do not prototype or wire this into the system until explicitly un-parked.

## Goal

Add a judgment-based layer that evaluates overall risk beyond classic vulnerabilities (data exposure, permission misuse, surprising side-effects).

## Default data policy (current stance)

- The model should be allowed to read the code as needed (no additional “metadata-only” constraints right now).
- We accept that assessment requires code access; do not add extra restrictions at this stage.

## Open questions (must resolve before un-parking)

- What is the judge’s input artifact set (full source vs diffs vs summaries)?
- What model/provider(s) are allowed? What are the cost bounds?
- Does judge output gate enablement or remain advisory?
- How do we redact secrets in the judge inputs (and where is that enforced)?
- What is the override / audit trail format?

