# Habitat SDK Recovery Evidence

Latest: the scoped native migration landed on `main`. Its
[observed qualification](observed-qualification.md) separates the RC1 and RC3
results, the parked Windows platform and the `0.7.0` release boundary.

Current exception to the original repair hold: the owner admitted the
[scoped native migration](native-migration-candidate.md) for implementation,
qualification and landing on `main` through required checks, not for a release,
package publication or deployment. This is not a general
reopening of SDK design or a validation of the historical framing method.

Earlier re-entry view: [completed telemetry source retirement](telemetry-retirement.md),
with a [visual timeline](resources/research/recovery-timeline.html). It separates
one historical holding from a [recovered backend recipe](backend-reuse.md).
The earlier [merged-branch cleanup and lineage](cleanup-lineage-map.md) remains
a dated checkpoint.

This project record keeps the SDK assessment and its evidence in repository
governance instead of relying on files in Codex task output directories.
It does not reopen the completed runtime-release workstream or claim that the
later authoring and correctness findings are fixed.

## Read In This Order

1. [Habitat design philosophy](../../system/HABITAT_DESIGN_PHILOSOPHY.md):
   long-lived, owner-agreed governing intent, separate from current SDK status.
2. [SDK assessment](assessment.md): dated findings, uncertainties, candidate
   repair scope, and prerequisites before a repair plan.
3. [Source register](SOURCES.md): retained evidence from both recent threads
   and the earlier authoring proposal, with provenance and supersession.
4. [Triage](triage.md) and [deferrals](deferrals.md): the later data-driven
   framing-method investigation, repair gate, and repository-naming hold.
5. [Repository re-entry checkpoint](repository-state.md): current track, branch
   and worktree inventory, completed narrow cleanup, and held-source return points.
6. [Framing investigation baseline](framing-investigation-baseline.md): a
   lightweight data-preparation-first precursor, not the full investigation.

## Boundary Of This Consolidation

The owner requested that known intent and findings be captured first. After a
fresh context reset, dedicated investigation should identify and prepare the
large historical conversation dataset, then analyze it and develop validated
skills. Both the philosophy and assessment should be revisited through that
recovered frame before SDK repairs begin.

No historical transcript corpus, new skill, SDK change, blueprint change,
provider acceptance, or release is delivered by this documentation work.
The source snapshots are evidence, never a second current execution queue.

The [runtime implementation checkpoint](../habitat-runtime-realignment/IMPLEMENTATION.md)
remains the record of the bounded release. Its
[deferred-capability handoff](../habitat-runtime-realignment/deferred-capabilities.md)
still owns optional ledger, inquiry, host, transfer, and telemetry gates.

## Consolidation Verification

On 2026-09-15, the isolated documentation branch passed:

- `bun install --frozen-lockfile`, with no lockfile change.
- `bunx nx run habitat:check --skip-nx-cache --outputStyle=static`, including
  workspace lint and the selected structural/source-policy checks.
- Local Markdown target resolution: 197 links across 27 changed/new documents,
  with no missing files; all 13 source snapshots matched the intended
  provenance normalization of their captured originals, as recorded in SOURCES.md.
- `git diff --check`.

These checks validate this documentation consolidation, not the unresolved
runtime behavior. The assessment distinguishes the earlier 68-test audit from
this pass; no new SDK, release, or hosted-provider qualification is claimed.
