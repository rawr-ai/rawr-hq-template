---
title: RAWR Factory Bundle Export — spec analysis
id: rawr-factory-bundle-export-spec-analysis
tags:
- rawr-spec-landscape
- runtime-canon-arch-align
created: '2026-05-01T20:38:24.578636Z'
updated: '2026-05-01T21:10:18.322425Z'
source: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Factory_Bundle_Export_Spec.md
status: draft
type: source-analysis
tier: ground_truth
deprecated: false
---

## Identity
- spec_role: shape_correct
- source_path: /Users/mateicanavra/Documents/projects/RAWR/RAWR_Factory_Bundle_Export_Spec.md
- runtime_authority: no

## Scope and purpose

This spec defines RAWR's "capability bundle and retargeting" model — i.e. RAWR positioned not just as a runtime architecture but as a **software foundry** that manufactures bounded, verified capabilities natively and then exports them as transferable `CapabilityBundle`s into foreign destinations via a `Retargeter` against a `TargetProfile`. The export model is layered on top of, but explicitly does not reopen, the canonical RAWR ontology (`packages / services / plugins / apps`). It also fixes (in Appendix A) the durable workstream/event/context-pack shapes used to drive a retargeting transfer to acceptance.

Two crisp posture statements anchor the spec: "RAWR manufactures source-side certainty. A retargeter burns down destination-side uncertainty," and "The foundry does not need to colonize every destination. It only needs to be the best place to manufacture transferable certainty."

## Concern coverage

- **Artifact production / packaging contract** — defines the canonical export unit (`CapabilityBundle`) as "a capability plus its proof pack" with id/version, contracts, invariants, source prefab, fixtures, golden cases, architecture/data-flow refs, portable + mappable verifiers, and provenance.
- **Distribution / retargeting** — covers selecting a `TargetProfile`, opening a retargeting workstream, compiling work-ready context packs, executing retargeting runs, and reverifying in destination.
- **Verification model** — three-part split: portable, mappable, destination-local. "portable verifiers may move / mappable verifiers may be regenerated / destination-local verifiers must be established in the destination."
- **Provenance & legibility** — bundles must carry rationale, diagrams, data-flow maps, ownership notes, and provenance records.
- **Acceptance & closure** — `DestinationAcceptance`, `WorkstreamClosure`, and explicit closure rules (portable + mappable + required local verification, plus mapping report + acceptance record).
- **Durable coordination** — full retargeting workstream state machine, plan revisions, runs, threads, worktrees, and a typed event envelope.
- **Context compilation** — `ContextRequest`/`ContextPack` shapes for `open | plan | run | review | handoff | human-summary` targets.
- **Benchmarking & measurement** — `BenchmarkEpoch` as a frozen frame fixing foundry version, capability suite, target profiles, and acceptance criteria; defines fidelity, lead_time, correction_cost, throughput.
- **Failure-mode taxonomy** — weak destination seams, missing structural analogue, false confidence from source success, bundle-too-thin, hidden destination redesign.
- **Scope boundary discipline** — section 12 "What the export model is not" and §6.7 "Export does not reopen the ontology."

Concerns the spec does **not** cover: signing, registry hosting, package-format byte layout, immutability storage, transport security, key management, semver/version negotiation across bundle revisions, GC of stale bundles, supply-chain attestation specifics.

## Platform-level signal

Primarily **Cross-cutting / Coordination**, with a strong governance overtone, and explicitly *not* Core Runtime. The spec is meta to the runtime: it defines how things produced inside the runtime are packaged and transferred outside it. Within the user's three-tier suggestion (core-runtime / coordination / governance), this spec straddles coordination (retargeting workstream lifecycle, context compilation) and governance (frozen benchmark epochs, acceptance discipline, what counts as a valid landing zone). It maps loosely onto Habitat SDK Layer L9-equivalent ("publish / export / distribute the manufactured artifact").

The runtime contact points are deliberately thin and shape-correct rather than authoritative: a bundle is "emitted" from a verified native build; a destination "verifier runs" portable / mappable / local checks. The spec does not specify how a bundle is loaded, activated, or executed in a runtime — that is delegated to whatever the destination runtime is, which is precisely the inversion the spec wants. **Flag as shape-correct on runtime touches.**

## Vendor integrations declared

None named. The spec is studiously vendor-neutral. There is no mention of Effect, oRPC, Inngest, Bun, Elysia, Drizzle, HyperDX, npm, OCI, sigstore, cosign, GitHub Releases, S3, or any registry. The `ArtifactRef` is an opaque string. `verifierHarnesses` is unspecified. This is consistent with the spec's posture that the destination remains free to keep its own architecture and toolchain.

## Don't-own-still-manage frontier

This is the spec's defining tension and it embraces it explicitly. Things RAWR does not own but the bundle model still has to manage from the integration POV:

- **Destination runtime semantics** — placed entirely outside the bundle. "Source verification does not imply destination correctness." Managed via the `DestinationVerifier` contract and the destination-local verification leg of the three-part split.
- **Destination framework idioms / composition units** — externalized into `TargetProfile.compositionUnits`, `runtimeSurfaces`, `persistenceConventions`, `dependencyRules`. RAWR does not encode them; it requires the destination to declare them.
- **Destination acceptance harness** — externalized as `verifierHarnesses` on the target profile.
- **Repository state, branches, worktrees in the destination** — modeled as `destinationRef` and `WorktreeAttachment`, but delegated to whatever VCS/workspace the destination uses.
- **Operator/reviewer judgement** — modeled as approval events and mapping reports, not automated.

Silences worth flagging:
- **No registry / hosting story.** A bundle is described as a structured object but the spec is silent on where bundles live, how they are addressed across organizations, and how a `bundleId` resolves to bytes. `ArtifactRef` is a typed alias for `string` with no resolution protocol.
- **No signing / integrity story.** "Provenance" is asserted as a bundle field but the spec does not require signatures, attestations, hash trees, or tamper-evidence. Immutability is implied by "frozen benchmark epochs" but not enforced at the bundle layer.
- **No version negotiation / compatibility story.** Bundles have a `version`, but bundle-vs-target-profile compatibility, deprecation, and migration of bundles across foundry versions are not specified beyond "frozen benchmark epochs."
- **No transport / fetch semantics.** How a retargeter actually obtains the bundle is unspecified.

These silences are the natural seam where the Deployment Subsystem spec, Habitat SDK Layers, and any future "registry / signing" spec would have to land.

## Completeness signals

- No explicit `TBD`, `TODO`, or "to be decided" markers anywhere.
- §11.1 says "The concrete retargeting-workstream shapes, event classes, and context packs are fixed in Appendix A," and Appendix A actually delivers those shapes. Self-contained.
- The shapes are admitted as minimum-canonical: "These shapes are not meant to freeze every subordinate field forever. They exist to fix the durable seams." That is exploratory-feeling at the field level but authoritative-feeling at the noun/seam level.
- Strong use of canonical-law framing (eight numbered laws in §6) and explicit anti-claims (§12 "What the export model is not"), which is a completeness-confidence signal.
- The spec leans on but does not duplicate the workstream system spec; Appendix A coexists with the Workstream System Canonical Spec and presents itself as "normative for retargeting workstreams" without reopening the core architecture.
- Areas under-specified relative to claimed scope: registry/signing/transport (entirely absent — see Don't-own-still-manage), how a `BenchmarkEpoch` is published / discovered, how `humanCorrections` is counted, how `goldenCases` and `fixtures` are serialized.

## Cross-spec dependencies

- **Defers to / coexists with**: `RAWR_Workstream_System_Canonical_Spec.md` (workstream is the system of record; Appendix A is "normative for retargeting workstreams" but does not reopen the core architecture).
- **Defers to / coexists with**: `RAWR_Workstream_Review_Subsystem_Canonical_Spec.md` (approval-requested / approval-recorded events; review-target context pack).
- **Defers to / coexists with**: a context engine (unnamed spec, but the language matches the broader RAWR context-compilation framing).
- **Implicitly downstream of**: `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md` (the source-side native manufacture happens there) and `Habitat_SDK_Layers_Draft_Spec.md` (likely L9 packaging/export tier).
- **Adjacent / consumer**: `RAWR_Deployment_Subsystem_Canonical_Spec.md` is a natural consumer of bundles; this spec does not call it out.
- **Does not reference**: any vendor spec or `RAWR_Service_Package_Effect_Spec.md`.

## Verbatim load-bearing definitions / claims

- §1 Scope — "This specification defines the canonical export model for RAWR as a software foundry."
- §1 Scope — "The canonical top-level nouns remain: packages / services / plugins / apps."
- §3.2 Export mode — "the transfer target is not 'the raw source tree' but a richer bundle of source, contracts, invariants, fixtures, architecture, and provenance"
- §3.2 Export mode — "The foundry does not need to colonize every destination. It only needs to be the best place to manufacture transferable certainty."
- §4 Core decomposition — "RAWR manufactures source-side certainty. A retargeter burns down destination-side uncertainty."
- §6.2 Bundle, not loose code — "The transferable unit is not just source files. It is a structured capability bundle."
- §6.5 — "Source verification does not imply destination correctness."
- §6.6 — "Verification concerns do not all travel equally well."
- §6.7 — "Export does not reopen the ontology. `CapabilityBundle` and `TargetProfile` are export-model nouns. They do not become new top-level architectural kinds beside packages, services, plugins, and apps."
- §6.8 — "Frozen benchmark epochs are required for honest measurement."
- §7.1 CapabilityBundle — "A bundle is a capability plus its proof pack."
- §7.2 TargetProfile — "A target profile is not a snapshot of one prompt. It is a durable description of what counts as a valid landing zone in that environment."
- §9.3 — "portable verifiers may move / mappable verifiers may be regenerated / destination-local verifiers must be established in the destination"
- §12 — "The foundry pays source-side architecture costs once. The retargeter pays destination-fit costs per target."
- §16 Final posture — "RAWR is not only a runtime architecture. It is also a manufacturing environment for canonical capability bundles."
- §A.2 — "workstream = durable coordination object and system of record"

## Estimated completeness grade (initial impression)

**B+.** The spec is internally consistent, definitionally precise, and self-contained on the conceptual model, the noun set, the verification split, the workstream lifecycle, and the benchmarking frame. It is deliberately silent on registry hosting, signing, transport, and version-compatibility — the operational substrate of any real bundle-export system — and that silence is conscious (matches the "don't own underlying behavior" stance) but does cap completeness for the broader landscape question. Strong on shape, thin on operational substrate.
