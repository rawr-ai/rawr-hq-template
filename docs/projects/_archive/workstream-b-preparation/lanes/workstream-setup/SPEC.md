# Workstream Setup Spec

## Ownership

`RAWR HQ-Template` owns the Workstream B preparation artifacts because upstream
is becoming the architecture and implementation authority.

The DRA owns final synthesis and acceptance. Agent pairs own lane drafts and
verification findings, but their outputs become accepted workstream state only
after DRA review.

## Target State

The preparation tree must let a future agent start any lane without asking:

- which repo owns the target,
- which docs are stale,
- which downstream behavior is evidence,
- which surfaces are forbidden,
- and what readiness means.

## Public Surface

The public surface is documentation only:

- `WORKSTREAM_RECORD.md`
- `AUTHORITY_MAP.md`
- `LANE_PACKET_TEMPLATE.md`
- `NEXT_PACKET.md`
- one lane packet under `lanes/<lane>/`.

## Internal Boundaries

- Top-level docs provide cross-lane authority, packet structure, and
  continuation context.
- Lane docs provide discovery, spec, rough implementation slices, and readiness
  for one target only.
- Lane docs do not create implementation authority by themselves; they are
  preparation artifacts for future implementation workstreams.

## Bring / Preserve / Remove / Ignore

Bring:

- Workstream-runner record/packet conventions.
- Team-design Mapper/Verifier pairing.
- Inquiry-design discipline: derive from evidence instead of asking low-value
  questions.

Preserve:

- Graphite branch hygiene.
- Downstream read-only inspection during preparation.
- Explicit distinction between preparation and implementation.
- Cross-lane execution sequence in `NEXT_PACKET.md`.
- Downstream hold until the final downstream sunset phase.

Remove:

- Nothing in this preparation lane.

Ignore:

- Old docs that claim a continuing split model as binding architecture.
- Quarantined docs unless a future lane explicitly mines them.

## Test And Evidence Contract

Required evidence:

- `git status --short --branch` in both repos.
- `gt ls` in upstream.
- downstream log evidence for Workstream A commit.
- `bunx nx show projects` in upstream.
- targeted lane `rg`/file reads.

Required artifact checks:

- All required files exist.
- No unresolved template placeholders remain.
- Artifacts mention no code migrations as already completed.

## Non-Goals

- No implementation.
- No repo-wide docs cleanup outside this artifact tree.
- No global sync/link repair.
- No branch submission.
- No downstream deletion authorization before final sunset.

## DRA Disposition

Accepted. This setup spec is the operating contract for the preparation
artifact tree.
