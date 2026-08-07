# Lane 2.1 Patch — Inngest mode amendment (Recommendation #5)

**Lane:** 2.1  
**Worker:** Worker A  
**Recommendation:** #5 — Inngest mode amendment  
**Decision in effect:** Decision #3 = Option B (no default mode at architecture level; mode-selection is a profile/deployment concern, deferred to deployment companion spec)  
**Spec target:** `resources/spec/RAWR_Canonical_Architecture_Spec.md`

---

## Sub-edit 2.1.A — Annotate the §13.2 stack diagram

**Spec location:** Lines 2264–2265

**BEFORE:**

```
  -> FunctionBundle
  -> Inngest harness
```

**AFTER:**

```
  -> FunctionBundle
  -> Inngest harness [serve-mode | connect-worker mode]
```

---

## Sub-edit 2.1.B — Add §13.2 mode paragraph

**Spec location:** Line 2270 (end of Integration contract paragraph); new paragraph inserted before §13.3 heading at line 2272

**BEFORE:**

```
**Integration contract.** The Inngest harness receives a `FunctionBundle` (runtime-spec §19.3) — not `MountedSurfaceRuntimeRecord` entries — along with the selected Inngest runtime resource and async harness mode. It must return a `StartedHarness`. RAWR owns async surface plan compilation, FunctionBundle derivation, and workflow dispatch semantics; Inngest owns durable async execution semantics. The complete contract and mode specifications are defined in the runtime realization specification, §21.2.
```

**AFTER:**

```
**Integration contract.** The Inngest harness receives a `FunctionBundle` (runtime-spec §19.3) — not `MountedSurfaceRuntimeRecord` entries — along with the selected Inngest runtime resource and async harness mode. It must return a `StartedHarness`. RAWR owns async surface plan compilation, FunctionBundle derivation, and workflow dispatch semantics; Inngest owns durable async execution semantics. The complete contract and mode specifications are defined in the runtime realization specification, §21.2.

**Mode.** The async harness operates in one of two modes — serve-mode (HTTP listener via `inngest/bun` or other framework adapters) or connect-worker mode (outbound persistent connection via `inngest/connect`). Mode choice changes the process's ingress topology (inbound HTTP vs outbound WebSocket) and is a harness-selection fact at process-start time. This specification declares no default mode at the architecture level; default-selection is a profile/deployment concern. Mechanics for both modes are defined in the runtime realization specification, §21.2.
```

---

## Sub-edit 2.1.C — Add mutual-exclusion invariant to §17.8

**Spec location:** Line 2818 (closing bullet of §17.8); new bullet appended immediately after

**BEFORE:**

```
- `RuntimeCatalog` is a diagnostic read model, not live access and not app composition.
```

**AFTER:**

```
- `RuntimeCatalog` is a diagnostic read model, not live access and not app composition.
- an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.
```
