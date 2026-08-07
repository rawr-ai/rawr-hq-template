# Wave 2 Consolidated Leaf Finding — Cleanup Cohort (Recs #5, #6, #7)

**Reviewer:** Opus inquisitor (consolidated Layer-1 leaf review)
**Lanes covered:** 2.1, 2.2, 2.3
**Date:** 2026-05-04
**Mode:** Read-only verification against post-edit specs.

---

## Lane 2.1 findings (Rec #5 — Inngest mode amendment)

### F-2.1.1 — §13.2 stack diagram annotation

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 2244 reads exactly `  -> Inngest harness [serve-mode | connect-worker mode]`. The terminal stack token carries the bracketed mode annotation as required.
- **Disposition:** accept.

### F-2.1.2 — §13.2 Mode paragraph

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 2251 carries the new `**Mode.**` paragraph. It names both modes — serve-mode (with `inngest/bun` cited as a framework adapter) and connect-worker mode (with `inngest/connect` cited). It states explicitly: "This specification declares no default mode at the architecture level; default-selection is a profile/deployment concern." This honors Decision #3 = Option B. Mechanics deferred to runtime-spec §21.2.
- **Disposition:** accept.

### F-2.1.3 — §17.8 mutual-exclusion invariant

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 2800 reads: "an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process." Appended after the `RuntimeCatalog` bullet at line 2799 as specified.
- **Disposition:** accept.

---

## Lane 2.2 findings (Rec #6 — compressions + per-name rule)

### F-2.2.1 — §10.4 compression

- **Severity:** none (pass)
- **Evidence:** §10.4 (lines 1673–1679) is fully compressed. The 9-item artifact prose list is removed. The new prose names "structured plan artifacts and an in-process execution descriptor table" with a cross-reference to runtime-spec §15. Negative scope retained.
- **Disposition:** accept.

### F-2.2.2 — §10.5 compression

- **Severity:** none (pass)
- **Evidence:** §10.5 (lines 1681–1689) is fully compressed. Both the 8-item validation list and 9-item emission list are removed. Replaced with single-paragraph prose plus the precedence sentence ("Compilation precedes provisioning and harness mounting…") and a cross-reference to runtime-spec §16.
- **Disposition:** accept.

### F-2.2.3 — §10.6 compression + irreducible codeblock preserved

- **Severity:** none (pass)
- **Evidence:** §10.6 (lines 1691–1706) is correctly compressed. The 8-item provisioning kernel inventory bullet list is collapsed to a single semicolon-separated prose sentence (line 1704). The "RAWR plans identity, order, dependency, lifetime, and boundary policy. / Effect executes scoped acquisition, release, runtime ownership, and process-local coordination." `text` codeblock survives verbatim at lines 1699–1702. Cross-reference to runtime-spec §14 + §17.3 added at line 1706. Process-local coordination negative-form sentence retained.
- **Disposition:** accept.

### F-2.2.4 — §17.6 8th bullet replaced with category pointer

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 2777 reads: "RAWR-owned process-local coordination resources are defined in the runtime realization specification, §14; their underlying Effect-internal primitives are runtime substrate detail and are not enumerated in this invariant set." Replaces the prior "runtime-local queues, pubsub, schedules, refs, fibers, and caches…" bullet.
- **Disposition:** accept.

### F-2.2.5 — Per-name rule grep audit

- **Severity:** none (pass)
- **Evidence:** Grep across the entire arch-spec for the four tokens `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessConcurrencyLimiterResource`, `ProcessCacheHubResource` returns zero hits. W-3 decision is honored exactly: these names are runtime-spec-only.
- **Disposition:** accept.

---

## Lane 2.3 findings (Rec #7 — execution-ownership law promotion + cross-ref + Effect.Service correction)

### F-2.3.1 — §4.0 inserted at top of §4

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 418 carries `### 4.0 Execution ownership law` inserted before the existing `### 4.1 Ownership law` (line 436). The 9-sentence canonical law is wrapped in a `text` codeblock (lines 422–432). Closing prose (line 434) explicitly references §4.3a and declares "the arch-spec owns the canonical wording of this law as integration vocabulary; the runtime realization specification cross-references this section as the canonical source" — Option B requirement met.
- **Disposition:** accept.

### F-2.3.2 — §18 forbidden patterns: Effect.Service removed

- **Severity:** none (pass)
- **Evidence:** Arch-spec line 2875 reads: "public raw `Layer`, `Context.Tag`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring for ordinary service, plugin, app, or entrypoint work;". Token list is exactly the required five (`Layer`, `Context.Tag`, `ManagedRuntime`, `Scope`, `FiberRef`) with `Context.Tag` appearing exactly once. `Effect.Service` no longer appears anywhere in the spec (zero grep hits).
- **Disposition:** accept.

### F-2.3.3 — Runtime-spec L36 cross-reference

- **Severity:** none (pass)
- **Evidence:** Runtime-spec line 36 reads: "Exactness: normative grammar split. Canonical source of this law: `RAWR_Canonical_Architecture_Spec.md`, §4.0. This section reproduces the law as runtime-realization context; arch-spec §4.0 is authoritative if the two diverge." The downstream `text` codeblock with the law body is preserved untouched.
- **Disposition:** accept.

### F-2.3.4 — Sub-edit 2.3.B skip (DRA judgment validation)

- **Severity:** none (pass — DRA judgment sound)
- **Evidence:** §4.9 (lines 581–590) closing sentence at line 590 reads: "Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners." This already carries the negative form ("not peer semantic owners") with a broader, more authoritative vendor enumeration than the proposed appended sentence (which only listed five vendors). The DRA decision to skip 2.3.B is sound: appending the proposed sentence would have been pure tautological repetition with strictly weaker vendor coverage. The existing sentence is the equivalent the patch was seeking.
- **Disposition:** skip validated as correct.

---

## Cross-cutting findings (Phase 1 preservation)

### F-X.1 — §10.14 registry intact

- **Severity:** none (pass)
- **Evidence:** §10.14 heading at line 1823; sub-sections §10.14.1 (line 1843), §10.14.2 (line 1854), §10.14.3 (line 1870), §10.14.4 (line 1874) all present. Registry rows referencing harness boundary, control-plane, and diagnostics remain in place.
- **Disposition:** accept.

### F-X.2 — §15.8 external interfaces table intact

- **Severity:** none (pass)
- **Evidence:** §15.8 heading at line 2654 present.
- **Disposition:** accept.

### F-X.3 — §10.12 named types intact

- **Severity:** none (pass)
- **Evidence:** §10.12 heading at line 1787; pre-runtime artifact reference at line 1805; boundary rule at line 1807 referencing §13.1–§13.6 + runtime-spec §21.
- **Disposition:** accept.

### F-X.4 — §13.1–§13.6 + §13.8 per-harness paragraphs intact

- **Severity:** none (pass)
- **Evidence:** §13.1 line 2209, §13.2 line 2230, §13.3 line 2253, §13.4 line 2274, §13.5 line 2295 (with OpenShell vendor contract preserved at line 2316), §13.6 line 2318, §13.8 attachment requirements line 2345 (referencing §10.14 registry at line 2359). All present and unchanged structurally.
- **Disposition:** accept.

### F-X.5 — §4.3a carve-out intact

- **Severity:** none (pass)
- **Evidence:** §4.3a heading at line 497 present and referenced from new §4.0 closing prose (line 434).
- **Disposition:** accept.

### F-X.6 — §10.6 codeblock referenced by §10.14.2 worked example still intact

- **Severity:** none (pass)
- **Evidence:** The "RAWR plans identity…" codeblock survives verbatim at arch-spec lines 1699–1702 (also paraphrased at the spec preamble line 19). Phase 1 §10.14.2 worked example's reference target is unbroken.
- **Disposition:** accept.

---

## Summary

- **Layer-1 status:** **pass**
- **Findings:** 19 total — 19 pass, 0 warn, 0 fail. Sub-edit 2.3.B skip validated as a sound DRA judgment.
- **Per-name rule grep audit:** zero hits for all four `Process*HubResource` tokens in the arch-spec.
- **Irreducible codeblocks:** §10.6 RAWR/Effect control-split codeblock and §4.0 9-sentence law codeblock both intact and verbatim.
- **DRA next action:** lift to Layer-2 composed review for Wave 2; no rework required from any worker. Phase 2 cleanup cohort is mechanically clean and ready to compose with Phase 1 outputs.
