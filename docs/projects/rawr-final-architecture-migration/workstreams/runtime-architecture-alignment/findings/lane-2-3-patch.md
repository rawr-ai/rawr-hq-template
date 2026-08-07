# Lane 2.3 Patch — Rec #7: Execution-Ownership Law Promotion + Runtime Cross-Reference + Effect.Service Correction

**Workstream:** Runtime-Architecture Alignment  
**Lane:** 2.3  
**Decision in effect:** W-2 Option B — arch-spec authors law at new §4.0; runtime-spec L37–L47 cross-references arch-spec §4.0 as canonical source.  
**Date:** 2026-05-04

---

## Sub-edit 2.3.A — Insert §4.0 in arch-spec at the top of §4 (Canonical laws)

**File:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**Verified BEFORE block (lines 416–418):**

The `## 4. Canonical laws` heading is followed immediately by a blank line and then `### 4.1 Ownership law` (no intro paragraph between the `## 4.` heading and `### 4.1`). The insertion target is therefore the blank line + `### 4.1` heading itself.

```
BEFORE (lines 416–418):
```

```markdown
## 4. Canonical laws

### 4.1 Ownership law
```

```
AFTER:
```

````markdown
## 4. Canonical laws

### 4.0 Execution ownership law

The canonical execution ownership split is:

```text
RAWR owns semantic/runtime boundaries.
oRPC owns callable contract mechanics.
Effect owns local execution mechanics.
Inngest owns durable async.
Native hosts own host interiors after RAWR adapter lowering.
The SDK derives.
The runtime realizes.
Harnesses mount.
Diagnostics observe.
```

This statement is the most compact, most memorable, most normative integration statement carried by this specification. Companion subsystem specifications and vendor integration authors may cite this paragraph directly when defending their boundary. Per the names-versus-mechanics carve-out (§4.3a), the arch-spec owns the canonical wording of this law as integration vocabulary; the runtime realization specification cross-references this section as the canonical source.

### 4.1 Ownership law
````

---

## Sub-edit 2.3.B — Add negative-form sentence to arch-spec §4.9

**File:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**Section targeted:** `### 4.9 Harness and substrate choice are downstream` (line 563)

**Rationale:** This is the section that establishes the vendor-as-native-interior posture. Its closing sentence already names Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts as "native interiors behind RAWR-shaped boundaries." It is the correct and only location for the negative-form companion sentence from runtime-spec §25.7. No separate `### 4.x Vendor-as-native-interior` subsection exists; §4.9 is the functional equivalent.

**Verified BEFORE block (line 572):**

```
BEFORE (line 572):
```

```markdown
Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners.
```

```
AFTER:
```

```markdown
Effect, oRPC, Elysia, Inngest, OCLIF, web hosts, desktop hosts, OpenShell, and agent hosts are native interiors behind RAWR-shaped boundaries. They are not peer semantic owners.

Effect, oRPC, Elysia, Inngest, and OCLIF are native interiors behind RAWR-shaped boundaries, not peer semantic owners.
```

---

## Sub-edit 2.3.C — Correct Effect.Service → Context.Tag in arch-spec §18 forbidden patterns

**File:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**Verified BEFORE block (line 2893):**

```
BEFORE (line 2893):
```

```markdown
- public raw `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring for ordinary service, plugin, app, or entrypoint work;
```

```
AFTER:
```

```markdown
- public raw `Layer`, `Context.Tag`, `ManagedRuntime`, `Scope`, or `FiberRef` authoring for ordinary service, plugin, app, or entrypoint work;
```

**Note:** `Effect.Service` is removed because it does not exist as a standalone Effect v3.21.2 module. The canonical service-pattern is `Context.Tag`, which is already listed in the bullet. This leaves `Context.Tag` named exactly once.

---

## Sub-edit 2.3.D — Cross-reference at runtime-spec L37–L47

**File:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`

**Verified BEFORE block (line 36):**

```
BEFORE (line 36):
```

```markdown
Exactness: normative grammar split.
```

```
AFTER:
```

```markdown
Exactness: normative grammar split. Canonical source of this law: `RAWR_Canonical_Architecture_Spec.md`, §4.0. This section reproduces the law as runtime-realization context; arch-spec §4.0 is authoritative if the two diverge.
```

**Note:** The `\`\`\`text` codeblock at lines 38–48 that follows this line remains untouched.

---

## Verification Summary

| Sub-edit | File | Verified Line(s) | Status |
|----------|------|-----------------|--------|
| 2.3.A | RAWR_Canonical_Architecture_Spec.md | 416–418 | Verified — no intro paragraph between `## 4.` and `### 4.1`; insertion is clean |
| 2.3.B | RAWR_Canonical_Architecture_Spec.md | 572 | Verified — §4.9 is the vendor-as-native-interior section; closing line confirmed |
| 2.3.C | RAWR_Canonical_Architecture_Spec.md | 2893 | Verified — `Effect.Service` token confirmed present; `Context.Tag` appears once before it |
| 2.3.D | RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md | 36 | Verified — `Exactness: normative grammar split.` is a single line preceding the codeblock |

## Divergences and Notes

- **2.3.A anchor:** The `## 4. Canonical laws` heading is followed immediately by `### 4.1` with no intervening intro paragraphs, so the BEFORE block starts at the heading itself rather than a closing intro paragraph.
- **2.3.B section identity:** The spec has no subsection titled "Vendor-as-native-interior." The targeted section `### 4.9 Harness and substrate choice are downstream` (line 563) is the functional equivalent — it is the sole location establishing vendor-as-native-interior posture in §4. The negative-form sentence appended here is a tighter, vendor-enumerated restatement of the existing final sentence, which already conveys the same idea. This is intentional redundancy that strengthens normative clarity for citation purposes.
- **2.3.C correctness:** After removing `Effect.Service`, the list reads: `Layer`, `Context.Tag`, `ManagedRuntime`, `Scope`, `FiberRef` — five tokens, `Context.Tag` exactly once.
