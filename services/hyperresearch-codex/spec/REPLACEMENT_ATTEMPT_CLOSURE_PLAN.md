# Hyperresearch Replacement-Attempt Closure Plan

This document records the accepted Hyperresearch service and packet-orchestration closure for non-clean cold-resumed child attempts. It supersedes prior ambiguity about fixing native child-handle resume inside the Hyperresearch service path.

## Decision

Hyperresearch Codex parity closes at the service and packet-orchestration boundary through ledgered replacement attempts when a runtime child handle remains non-clean or unavailable:

- The service treats a cold-resumed child handle that cannot be cleanly completed as a non-clean runtime attempt.
- The same logical packet job may be completed by a replacement attempt when the replacement writes the declared packet output and required artifacts.
- Replacement success proves durable packet/fan-in completion. It does not retroactively prove that the original child handle completed cleanly.

This keeps the service contract aligned with how Hyperresearch actually consumes work: packet outputs, artifact hashes, source captures, claim traces, patch logs, and final validation.

## Out Of Scope

- Hooks parity. Hooks remain a separate track.
- MCP parity. MCP remains parked because the direct Hyperresearch CLI backend is still the authoritative loop.
- Production Inngest readiness.
- Unrelated downstream global plugin drift.
- Automatic Codex descendant rehydration unless future evidence shows explicit child resume is insufficient.

## Implementation Contract

Replacement attempts are attempt metadata around an existing logical agent job, not a new orchestration surface.

The service records:

- the stable logical job id;
- the accepted attempt id and attempt number;
- the replaced attempt id, when applicable;
- the replacement reason;
- the original attempt classification;
- the accepted output path, output hash, and acceptance timestamp.

The ordinary first-attempt packet path still carries attempt metadata. A replacement output is accepted only when it matches the logical job, role, attempt metadata, artifact commitments, source URL contract, and current ledger state.

Duplicate replacement output for the same attempt is idempotent only when the content hash matches the accepted output hash. A different output for an already accepted logical job is an observation conflict and must block.

## Required Proof

The fallback proof must show:

- a logical packet job can complete through a valid replacement attempt after the original attempt is classified non-clean;
- replacement success never changes the original attempt classification to `clean_completed`;
- malformed replacement output, missing audit metadata, bad artifact hash, missing source capture, or conflicting duplicate output blocks;
- final `validate --backend real` still requires source capture, claim trace, patch-log coverage, and artifact integrity;
- downstream installed material tells parent coordinators to prefer explicit child resume and use replacement attempts only for non-clean child attempts.

## Review Loop

Run two review lanes before using this closure as release evidence:

- architecture/topology/spec review: module boundaries, service laws, schema consistency, public exports, and claim boundaries;
- behavior/evidence/testing review: replacement lifecycle, idempotency, source dedupe, artifact validation, and parity proof quality.

All accepted blocking findings must be recorded in `REVIEW_LEDGER.md` and fixed before commit.
