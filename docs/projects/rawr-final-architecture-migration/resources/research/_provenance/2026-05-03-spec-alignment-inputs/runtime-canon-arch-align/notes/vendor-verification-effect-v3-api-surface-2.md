---
title: Vendor Verification — Effect v3 API surface
id: vendor-verification-effect-v3-api-surface-2
tags:
- runtime-canon-arch-align
- kind:vendor-verification
created: '2026-05-02T20:52:48.765560Z'
status: draft
type: note
deprecated: false
summary: 'Effect v3.21.2 API surface verification: Layer, Context.Tag, ManagedRuntime,
  Scope, FiberRef all confirmed present as arch-spec states. Effect.Service is a minor
  naming imprecision (correct concept is Context.Tag class pattern). Forbidden-pattern
  list in arch-spec is substantially accurate for Effect v3.'
---

# Vendor Verification — Effect v3 API Surface

**Technology:** Effect
**Version verified:** 3.21.2 (latest as of 2026-05-02)
**Source:** https://raw.githubusercontent.com/Effect-TS/effect/main/packages/effect/src/index.ts
**Relevance:** The RAWR canonical architecture spec (arch-spec L2775–L2776) names `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, and `FiberRef` as forbidden in ordinary service/plugin/app/entrypoint authoring. These names need to be confirmed as current Effect v3 API names.

## Verification Results

### Names confirmed present in Effect v3 (verified from index.ts exports):
- `Layer` — `export * as Layer from "./Layer.js"` — CONFIRMED
- `Context` (namespace, which includes `Context.Tag`) — `export * as Context from "./Context.js"` — CONFIRMED
- `FiberRef` — `export * as FiberRef from "./FiberRef.js"` — CONFIRMED
- `ManagedRuntime` — `export * as ManagedRuntime from "./ManagedRuntime.js"` — CONFIRMED
- `Scope` — `export * as Scope from "./Scope.js"` — CONFIRMED

### Effect.Service status:
The arch-spec lists `Effect.Service` as forbidden. In Effect v3, `Effect.Service` appears in documentation context as the pattern for defining services using `Context.Tag`. The index.ts does NOT export a module named `Service` as a namespace (unlike `Layer`, `Scope`, `ManagedRuntime`). Instead, the service pattern in Effect v3 uses `class MyService extends Context.Tag("MyService")<MyService, {}>() {}`. References to "service" in the Effect codebase are comment-level or example-level.

**Judgement:** `Effect.Service` as a standalone export does not appear to exist as a named module in Effect v3 — the service pattern IS `Context.Tag`. The arch-spec's forbidden-pattern list slightly mislabels this: the correct forbidden pattern is `Context.Tag` (which IS a valid Effect v3 export) rather than `Effect.Service`. The intent of the rule is correct (don't expose raw service tags in ordinary authoring); the naming is slightly imprecise.

## Claim vs Actual Judgement

| Arch-spec claim | Actual Effect v3 state | Verdict |
|---|---|---|
| `Layer` exists as a public export | CONFIRMED — `export * as Layer from "./Layer.js"` | ACCURATE |
| `Context.Tag` exists as a public export | CONFIRMED — `Context.Tag` is the primary service definition pattern | ACCURATE |
| `Effect.Service` exists as a forbiddable construct | PARTIALLY ACCURATE — "service" in Effect v3 is the `Context.Tag` class pattern; there is no standalone `Effect.Service` module | MINOR NAMING IMPRECISION |
| `ManagedRuntime` exists as a public export | CONFIRMED — `export * as ManagedRuntime from "./ManagedRuntime.js"` | ACCURATE |
| `Scope` exists as a public export | CONFIRMED — `export * as Scope from "./Scope.js"` | ACCURATE |
| `FiberRef` exists as a public export | CONFIRMED — `export * as FiberRef from "./FiberRef.js"` | ACCURATE |

## Alignment recommendation impact

The arch-spec's forbidden-pattern list for Effect vocabulary is substantially accurate for Effect v3. The only imprecision is `Effect.Service` — which should arguably read `Context.Tag` (the actual name of the service-definition pattern). This is a minor naming issue, not a structural contradiction. The rule's intent (quarantine raw Effect service/layer/runtime vocabulary from ordinary authoring) is correctly stated.

The arch-spec's authority split ("RAWR plans identity, order, dependency, lifetime, and boundary policy. Effect executes scoped acquisition, release, runtime ownership, and process-local coordination.") maps correctly onto Effect v3's actual capability set.
