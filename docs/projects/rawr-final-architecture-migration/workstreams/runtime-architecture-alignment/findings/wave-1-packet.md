# Wave 1 Packet — Structural Cohort

Wave: Phase 1 / Wave 1 (structural cohort)
Wave objective: apply Recs #1–#4 from `runtime-architecture-alignment-plan.md` to `RAWR_Canonical_Architecture_Spec.md`, establishing the per-name classification rule and the registry that codifies it.

## Lanes

| Lane | Rec | Sonnet worker | Opus inquisitor | Depends on |
|---|---|---|---|---|
| 1.1 | Rec #1 — scope rewrite + §4.3a carve-out | Worker A (sonnet) | Inquisitor A (opus) | none |
| 1.2 | Rec #2 — §10.14 registry + L25 upgrade | Worker B (sonnet) | Inquisitor B (opus) | none |
| 1.3 | Rec #3 — §10.12 + §13.x | Worker C (sonnet) | Inquisitor C (opus) | 1.1 + 1.2 |
| 1.4 | Rec #4 — §15.8 external interfaces | Worker D (sonnet) | Inquisitor D (opus) | none |

Lanes 1.1, 1.2, 1.4 are independent and run in parallel. Lane 1.3 runs after 1.1 + 1.2 land (its §13.5 + §10.12 references depend on the carve-out + registry being live).

## Inputs

- Alignment plan: `docs/projects/rawr-final-architecture-migration/resources/research/runtime-architecture-alignment-plan.md`
- Target: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`
- Decisions: `docs/projects/rawr-final-architecture-migration/workstreams/runtime-architecture-alignment/decisions.md`
- Source investigation notes: `docs/projects/rawr-final-architecture-migration/resources/research/_provenance/2026-05-03-spec-alignment-inputs/runtime-canon-arch-align/notes/`

## Allowed edit surfaces

- `RAWR_Canonical_Architecture_Spec.md` (primary)
- `findings/lane-1-{1,2,3,4}-patch.md` (worker output landing zone)
- `findings/lane-1-{1,2,3,4}-finding.md` (inquisitor output landing zone)

## Forbidden files / scope

- `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` (out for Wave 1; only Wave 2 Lane 2.3 touches it)
- `packages/**` (out for entire workstream)
- Any file outside `docs/projects/rawr-final-architecture-migration/`

## Scratch policy

Workers write patches to `findings/lane-1-X-patch.md` (durable artifact, not scratch). Inquisitors write findings to `findings/lane-1-X-finding.md` (durable artifact). No ephemeral scratch.

## Expected output per lane

- One patch file with the AFTER content + line-anchor or text-anchor for application.
- One DRA application of the patch via Edit tool, committed as one git commit.
- One finding record with severity + disposition recommendation per Layer-1 review.

## Required gates

- Layer-1 leaf review per lane (DRA dispositions every P1/P2 finding before Wave-1 close).
- Layer-2 composed review at Wave-1 close (Opus integrator).

## Branch / Graphite constraints

Single feature branch `align-arch-spec-with-runtime-realization`. One commit per landed sub-edit (or per landed lane if a lane produces only one edit).

## Lane done condition

Edit applied to spec file + leaf finding produced + DRA disposition recorded. P1 accepted → repair before lane close.

## Wave done condition

All four lanes done + Layer-2 composed review pass + record updated.

## DRA decision points

- Decision #2 (OpenShell) implication for Lane 1.3 §13.5 paragraph (locked: Option B, third-party with vendor contract).
- Decision #4 (harness type subset) for Lane 1.3 §10.12 (locked: Option A, full 7-type).
- Decision #5 (RuntimeDiagnosticContributor row) for Lane 1.4 (locked: Option B, omit).
- W-4 (PortableRuntimePlanArtifact naming) for Lane 1.4 (locked: name now in §15.8).
