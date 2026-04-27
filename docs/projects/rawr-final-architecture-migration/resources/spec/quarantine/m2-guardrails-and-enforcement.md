# M2 Guardrails And Enforcement

This document is normative for M2 execution. It supersedes the archived Phase 1 guardrail and enforcement drafts for the current milestone only; it does not replace the architecture specs, the testing plan, the M2 milestone, or the M2 issue docs.

## Authority Order

Use this order when sources disagree:

1. [RAWR_Canonical_Architecture_Spec.md](./RAWR_Canonical_Architecture_Spec.md)
2. [RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md](../_archive/RAWR_Effect_Runtime_Subsystem_Canonical_Spec.md)
3. [RAWR_Canonical_Testing_Plan.md](./RAWR_Canonical_Testing_Plan.md)
4. [RAWR_Architecture_Migration_Plan.md](../RAWR_Architecture_Migration_Plan.md)
5. [M2-minimal-canonical-runtime-shell.md](../../milestones/M2-minimal-canonical-runtime-shell.md)
6. [M2 issue docs](../../issues/)
7. This document.

Archived material under `resources/_archive/` is provenance. It may explain why a guardrail exists, but it is not active authority unless this document or an M2 issue explicitly carries the obligation forward.

## Enforcement Model

M2 uses this loop:

```text
canon -> graph -> proof -> ratchet
```

`canon` is the architecture and milestone language. It defines what must become true.

`graph` is the Nx/project graph plus lint-boundary model. It enforces dependency direction and makes architectural ownership visible before runtime behavior is considered. Nx is the structural control plane, not a second manifest.

`proof` is the slice verifier and runtime evidence that a claim is true. Proof must cover the claim being made, not just the happy path. A runtime claim needs a runtime proof; a public-seam claim needs a public-seam proof; a deletion claim needs import/path/package proof.

`ratchet` is the promotion step. Once a claim is true, the verifier moves into a project structural target, a permanent architecture gate, or a milestone-specific gate so the repo cannot drift backward.

## Active Ownership Rules

M2 must preserve the ownership model installed by M1:

- Apps own identity, entrypoints, and role selection.
- Services own semantic policy, schemas, repositories, algorithms, and data/query behavior.
- Plugins own projections into runtime lanes and concrete resource binding until Effect process resources replace that binding.
- `packages/hq-sdk` owns public authoring and app-runtime seams.
- `packages/runtime/*` owns hidden execution mechanics.
- Effect owns acquisition, lifetime, scope, and failure mechanics behind RAWR-shaped public APIs.

The runtime subsystem must not become a second semantic plane. If a rule explains what a business capability means, it belongs in the service or plugin/app projection that owns that meaning. If a rule explains how a process starts, acquires resources, supervises, or releases, it belongs in the runtime subsystem.

## Proof Layers

Every M2 slice chooses the smallest proof band that closes its claim, but the band must be explicit:

- Graph law: workspace roots, package exports, dependency direction, and public/private package seams.
- Lint purity: no forbidden cross-layer imports, no raw runtime substrate leakage through public APIs, and no legacy package resurrection.
- Static structural checks: AST/path/package checks under `scripts/phase-2/`, `scripts/architecture/`, `scripts/observability/`, `scripts/runtime/`, or project structural verifiers.
- Typecheck/build: affected projects plus root aggregators when public package shape changes.
- Tests: targeted behavioral tests for the changed seam.
- Command/platform smoke: required when a slice touches process startup, CLI surfaces, server boot, async activation, or runtime lifecycle.

Root scripts are aggregators. Project-owned `structural`, `sync`, `typecheck`, `build`, and `test` targets remain the normal local proof surface.

## Gate Classification

Permanent architecture gates enforce invariants that survive M2:

- no old operational owner packages or imports
- no legacy `@rawr/hq` facade imports
- canonical plugin topology
- manifest purity
- HQ Ops service shape
- service/projection boundary ratchets
- sync-check and structural-suite plumbing
- durable telemetry, host metrics, logging, and HQ lifecycle contracts

M2-specific gates enforce the live runtime cut:

- no `apps/hq/legacy-cutover.ts`
- canonical server role runtime path
- runtime public seam quarantine
- bootgraph lifecycle and failure semantics
- runtime compiler and process-runtime shape
- async harness path
- canonical role and surface builders
- proof-slice migration to the runtime shell
- plateau closure with transitional seams deleted

Archived-only gates remain useful history but are not active validation:

- Phase 1 ledger baseline
- no-live coordination/support-example archive proofs
- agent marketplace and parked-lane freezes
- U00 scaffold allow-findings gate as an active script
- broad Phase 2.5 closure allowlists
- old Phase 2.5 aggregate gates

If a retired script still contains a durable check, promote the durable check under a current permanent name before deleting the retired active reference.

## M2 Ratchet Progression

`M2-U00` starts the real Phase 2 proof band. The current `--allow-findings` helpers are current-state diagnostics only; they must not be listed as active Nx included scripts or treated as passing architecture proof.

`M2-U00` closes when the legacy cutover is deleted, the server role boots through canonical public APIs, runtime public seams are quarantined, and the U00 contract gate runs without allow-findings.

`M2-U01` closes when bootgraph proves dependency order, identity dedupe, rollback, shutdown ordering, and tagged runtime errors.

`M2-U02` closes when compiler and process-runtime prove ProcessView, RoleView, SurfaceAssembler, and started-process lifecycle without leaking Effect vocabulary through public APIs.

`M2-U03` closes when async workflow/schedule activation runs through the canonical runtime shell and Inngest harness.

`M2-U04` closes when transitional public plugin builders are replaced by canonical role and surface builders.

`M2-U05` closes when proof slices run through the canonical runtime shell instead of transitional host composition.

`M2-U06` closes when all transitional runtime seams are deleted or archived, permanent gates reflect the plateau, and docs describe actual Plateau 2 reality.

## Implementation Flexibility

M2 does not require one exact script implementation or one exact internal package layout for every verifier. It does require that each slice proves the architectural claim it makes and that the proof can be maintained by the owning project.

Allowed implementation flexibility:

- verifier implementation language and helper structure
- exact Nx tag names, as long as dependency direction is enforced
- structural script internals, as long as failure messages are actionable
- temporary projection-owned concrete resource instantiation until Effect process resources own acquisition
- narrow helper APIs that are consumed immediately by the slice that introduces them

Not allowed:

- descriptor-only prework that is not consumed by the live runtime path
- public generic DI/container vocabulary as a peer architecture
- raw Effect types in public authoring APIs
- service behavior in CLI/plugin projection code
- plugin/app code creating semantic service clients through untyped dispatch or duplicated DTO contracts
- allow-findings scripts in active validation
- retired phase labels driving current gates after their durable checks have been promoted

## Agent Operating Rules

Execution agents must work from the active M2 packet and current repo state, not from archived docs alone.

- Use Nx for project and target truth.
- Use Narsil/code search for symbol, import, and proof-surface discovery.
- Use native file reads, `rg`, package scripts, and Nx project config as final repo truth.
- Keep `.context/M2-execution/` as the hot execution packet.
- Put durable normative material under `resources/spec/`.
- Put supporting research under `resources/research/`.
- Preserve M1 history under archive paths without letting it drive active validation.
- Do not start a new service migration while the active M2 docs/gates are still ambiguous.

## Provenance

This document carries forward the useful parts of:

- [guardrails.md](../_archive/guardrails.md)
- [enforcement_spec.md](../_archive/enforcement_spec.md)
- [proposal.md](../_archive/proposal.md)

It intentionally does not carry forward old V3/V5 framing, old proposal paths, external research-path references, `packages/bootgraph` as the active runtime target, `packages/runtime-context` as a survivor, or service-promotion lists that no longer match the current repo.
