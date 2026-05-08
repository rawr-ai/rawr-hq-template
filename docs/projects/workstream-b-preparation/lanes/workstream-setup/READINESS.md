# Workstream Setup Readiness

## Readiness Verdict

Prepared after review repair. The container artifacts define how future
Workstream B lanes should start, and the review ledger now supplies auditable
mapper/verifier provenance.

## Pair Packet

Mapper: Opening Pair Mapper.

Verifier: Opening Pair Verifier.

Objective: maintain the cross-lane artifact container and ensure every lane has
authority, evidence, output shape, and readiness criteria.

Allowed edit surfaces:

- `docs/projects/workstream-b-preparation/**`

Forbidden scope:

- code migrations,
- downstream mutation,
- global sync/link repair,
- future Inngest architecture decisions.

Evidence paths:

- `WORKSTREAM_RECORD.md`
- `AUTHORITY_MAP.md`
- `REVIEW_LEDGER.md`
- `REPAIR_PLAN_VERBATIM.md`
- `LESSONS.md`
- `LANE_PACKET_TEMPLATE.md`
- `NEXT_PACKET.md`
- all lane packet files.

Required output: updated setup artifacts only when the preparation packet itself
needs correction.

Required gates:

- `git status --short --branch`
- `gt ls`
- artifact existence check.
- artifact hygiene scan for stale closure phrases.
- targeted accepted-finding checks against `REVIEW_LEDGER.md` and lane packets.

Lane done condition: future lanes can start from their `READINESS.md` without
asking authority questions.

DRA decision point: accept or reject any proposed change to the authority order.

## Execution Position

This lane is already executed by the preparation branch. Reopen it only to fix
factual errors in the preparation packet, update the cross-lane execution
sequence, or apply a new user/DRA authority decision.

The setup lane is docs-only. It must not become a backdoor for code migration,
downstream mutation, global sync, or link repair.

## First Reads

- `docs/projects/workstream-b-preparation/NEXT_PACKET.md`
- `docs/projects/workstream-b-preparation/AUTHORITY_MAP.md`
- `docs/projects/workstream-b-preparation/LANE_PACKET_TEMPLATE.md`
- `docs/projects/workstream-b-preparation/REVIEW_LEDGER.md`

## First Commands

```bash
git status --short --branch
gt ls
find docs/projects/workstream-b-preparation -type f | sort
rg -n "<repair hygiene pattern>" docs/projects/workstream-b-preparation -g '!REPAIR_PLAN_VERBATIM.md'
```

## Ready-To-Plan Checklist

- [x] Upstream repo state captured.
- [x] Downstream repo state captured.
- [x] Workstream A landed commit captured.
- [x] Authority order captured.
- [x] Actual mapper/verifier provenance captured.
- [x] Verbatim repair plan captured.
- [x] Removal lessons capture added.
- [x] Lane packet shape captured.
- [x] Future lane startup instructions captured.

## Pause Conditions

Pause and ask the DRA before continuing if:

- a proposed setup edit changes the authority order,
- a proposed setup edit changes the lane execution sequence,
- a proposed setup edit authorizes downstream deletion before final sunset, or
- the packet correction requires code migration, global sync, or link repair.

## Deferred Risks

- Future lanes must refresh evidence before implementation because code may
  drift after this preparation branch.

## DRA Acceptance

Accepted after review repair.

## Review Repair Addendum

- Accepted findings: `F-00-01`, `F-00-02`, `F-00-03`.
- Future lanes must consume `REVIEW_LEDGER.md`, and any deletion target with
  hard-won lessons must preserve them in `LESSONS.md` or a lane-local lesson
  artifact.
