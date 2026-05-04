# Lane 3 Patch — Phase 3 Downstream Audit Edits

**Spec file:** `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

**Lane 3.6 note:** No edits required. §10.12 (line 1803) already carries the `traceId` integration invariant (Phase 1 Lane 1.3). §10.14.3 (line 1870) and §10.14.4 (line 1874) already carry the phase-transition and error-propagation sub-sections (Phase 1 Lane 1.2).

---

## Sub-edit 3.1.A — §10.2 Derivation row fix

**Location:** Line 1659

**BEFORE:**
```
| Derivation | Normalized authoring graph, service binding plans, surface runtime plans, workflow dispatcher descriptors, portable plan artifacts | `@rawr/sdk` | Runtime compiler |
```

**AFTER:**
```
| Derivation | Normalized authoring graph, portable plan artifacts, non-portable execution descriptor table, service binding plans, surface runtime plans, workflow dispatcher descriptors — artifact shapes defined in the canonical runtime realization specification, §15 | `@rawr/sdk` | Runtime compiler |
```

---

## Sub-edit 3.2.A — §17.8 terminal cross-reference invariant

**Location:** Line 2800 (after existing Inngest mutual-exclusion bullet, before `### 17.9 Plugin invariants` at line 2802)

**BEFORE:**
```
- an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.
```

**AFTER:**
```
- an async role process binds exactly one Inngest harness mode per started process; serve-mode and connect-worker mode are mutually exclusive within a single process.
- all runtime mechanics, artifact shapes, named coordination resources, and substrate internals are defined in the canonical runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec`); this specification owns the integration vocabulary and invariant statements, not the mechanic implementations.
```

---

## Sub-edit 3.3.A — L25 augmentation with §4.3a cross-reference

**Location:** Line 25

**BEFORE:**
```
This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at named integration boundaries enumerated in §10.14. The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

**AFTER:**
```
This specification is the canonical integrated plug-and-play architecture layer. Subsystem specifications attach to it at named integration boundaries enumerated in §10.14, governed by the names-versus-mechanics carve-out in §4.3a. The runtime realization specification (`RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`) is the current canonical companion document for all runtime concerns; it is authoritative on mechanics within each integration boundary this specification names. It defines the whole system, the vocabulary the system uses, the architectural laws that keep it coherent, and the integration points where deeper subsystem blueprints attach.
```

**Change:** Inserts ", governed by the names-versus-mechanics carve-out in §4.3a" after "§10.14".

---

## Sub-edit 3.4.A — §10.14 Service binding row five-lane enumeration

**Location:** Line 1836

**BEFORE:**
```
| Service binding | §10.9 | §18.3–§18.5 | Arch-spec: cache-key exclusion rule | Runtime-spec: ServiceBindingCache mechanics, bindService contract | `ServiceBindingCache`, `ServiceBindingCacheKey` | Runtime realization spec |
```

**AFTER:**
```
| Service binding | §10.9 | §18.3–§18.5 | Arch-spec: cache-key exclusion rule | Runtime-spec: ServiceBindingCache mechanics, bindService contract | `ServiceBindingCache`, `ServiceBindingCacheKey`; five context lanes: `deps`, `scope`, `config`, `invocation`, `provided` | Runtime realization spec |
```

**Change:** Appends "; five context lanes: `deps`, `scope`, `config`, `invocation`, `provided`" to the "Named interface contract types" cell.

---

## Sub-edit 3.5.A — §17.8 RuntimeAccess scoping invariant

**Location:** Lines 2794–2795

**BEFORE:**
```
- live runtime access nouns are `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`;
- runtime access never exposes raw Effect internals, provider internals, or unredacted config secrets;
```

**AFTER:**
```
- live runtime access nouns are `RuntimeAccess`, `ProcessRuntimeAccess`, and `RoleRuntimeAccess`;
- service handlers do not receive broad `RuntimeAccess`; only their declared `deps`, `scope`, `config`, per-call `invocation`, and execution-derived `provided`;
- runtime access never exposes raw Effect internals, provider internals, or unredacted config secrets;
```

**Change:** Inserts one new bullet between the two existing ones formalizing the RuntimeAccess scoping invariant.
