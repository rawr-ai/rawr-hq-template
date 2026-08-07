# Platform Architecture Integration Delta

Status: draft setup note

## Summary

Frozen remains the right baseline for the platform document. The finalized platform architecture specification should be built from frozen's structure and authority posture, then harvest forward-locked decisions and clearer language from `_inbox/latest` and the runtime realization spec.

In shorthand:

```text
platform spec = frozen structural baseline
  + latest hub/framing/authority improvements
  + runtime spec's settled execution decisions
  - latest's over-promotion of runtime mechanics into platform ontology
```

## What Remains From Frozen

Keep frozen as the platform-doc structure and authority base:

- platform architecture owns ontology, laws, vocabulary, boundaries, handoffs, and companion-spec attachment points;
- runtime realization owns mechanics inside the runtime boundary;
- names-versus-mechanics carve-out remains the governing platform/runtime split;
- companion-spec registry and attachment protocol remain structural authority;
- OpenShell vendor-contract treatment from frozen remains important input, but the exact vendor/governance details can stay reserved unless the final pass explicitly locks them.

## What To Pull From `_inbox/latest`

Harvest as platform-spec improvements, not wholesale replacement:

- rename/reframe toward "Platform Architecture Specification";
- stronger hub-document language;
- clearer scope and authority wording;
- authority plane model where it improves reader orientation;
- reserved/flexible/gap discipline;
- clearer "owns vs defers vs reserves" phrasing;
- compact architecture-level statements of the runtime execution posture.

Do not copy `_inbox/latest` as the platform baseline. Its risk is placing too many runtime mechanics directly into the architecture hub.

## What To Pull From Runtime Realization Spec

Treat these runtime decisions as settled authority and surface them in the platform spec only as architecture laws or integration boundaries:

- one RAWR execution terminal;
- no Promise/handler business terminal for RAWR-owned execution;
- descriptor-first execution is the runtime path;
- `ExecutionRegistry` and `ProcessExecutionRuntime` are real runtime mechanics;
- providers use `ProviderEffectPlan` / `providerFx`;
- `EffectRuntimeAccess` is an internal runtime/SDK bridge, not a public service/plugin authoring surface;
- process-local coordination is non-durable;
- OpenShell/agent hosts are harness/native interiors, not semantic owners or durable execution owners;
- diagnostics and telemetry observe/report; they do not compose, acquire, mutate, or select.

The platform spec should reference the runtime realization spec for mechanics, type shapes, lifecycle details, registry matching, provider lowering, bootgraph execution, adapter contracts, diagnostics inventories, and gates.

## What Moves To A Standalone Spec-System Document

The platform spec should not own all rules for the specification corpus. Extract or centralize:

- hub/companion model;
- cross-spec authority ownership;
- attachment protocol;
- reserved-boundary rules;
- deferral-vs-gap discipline;
- supersession and stale-copy handling;
- how companion specs may deepen a boundary without silently redefining hub ontology or another spec's mechanics.

The platform spec should reflect these rules structurally, link to them, and obey them. It should not list the whole corpus governance system inline.

## Runtime Noun Placement Rule

Runtime nouns may appear in the platform spec only when they are integration-facing names needed to define a platform boundary. Their mechanics belong in the runtime realization spec.

Examples:

- Allowed as boundary references: `ExecutionRegistry`, `ProcessExecutionRuntime`, `ProviderEffectPlan`, `RuntimeDiagnostic`, `RuntimeTelemetry`.
- Not allowed as platform ontology: treating those runtime nouns as top-level architecture kinds or copying their full mechanics into the platform document.

## Still-Open Cleanup Items

These should become small decision-packet or final-review items, not blockers for the baseline choice:

- exact hub vocabulary rule for runtime nouns;
- whether to add one platform sentence banning Effect-prefixed semantic kinds such as `EffectService` / `EffectPlugin`;
- `SurfaceRuntimeAccess` taxonomy consistency between platform and runtime docs;
- platform/deployment external-interface lock point;
- OpenShell governance/vendor details beyond the already-locked harness/native-interior boundary.

## Next Turn Use

Use this note as the practical integration delta for the composition team. The team should not re-litigate the baseline unless new evidence contradicts the settled split:

- frozen = platform baseline;
- `_inbox/latest` = harvest source;
- runtime realization spec = runtime decision authority.
