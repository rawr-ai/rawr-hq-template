# Terminology/DX Evaluator Report

## Verdict

Use a synthesis, with Alt-X-2 as the terminology and DX spine.

Alt-X-2 is the better base because it explains the system as operational laws and authoring levels instead of a long canonical noun inventory. It front-loads what stable architecture answers versus what runtime realization answers, separates public authoring terms from internal mechanism terms, and gives plugin/app/resource examples that feel closer to APIs an author could use without learning runtime internals.

Alt-X-1 still has phrases worth carrying forward: the concise thesis, the `definition / selection / derivation / provisioning` lifecycle, the stable-flexibility section, and the canonical diagnostic noun `RuntimeCatalog`. The synthesized spec should not take Alt-X-1 wholesale because it promotes too many internal mechanism names as public canonical names.

## Stable Terminology

The stable core is aligned across both specs:

- Stable architecture remains `app -> manifest -> role -> surface`; runtime realization remains `entrypoint -> runtime compiler -> bootgraph -> Effect provisioning kernel -> process runtime -> harness -> process`. Alt-X-2 makes the split sharper by listing what each side answers: meaning/ownership/app membership versus what boots, binds, mounts, starts, observes, and shuts down. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:14-42`.
- Ownership boundaries are stable: RAWR owns semantic meaning, Effect owns provisioning mechanics, SDK owns derivation, adapters lower, and boundary frameworks keep native semantics. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:107-119`.
- The service/plugin/app/resource grammar is stable: services own truth, plugins project, apps select/compose, resources provision substrate, runtime realizes. Alt-X-1 states this very cleanly and should contribute this phrasing. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md:83-97`.
- Public/internal split is stable: `WorkflowDefinition` / `ScheduleDefinition` are public authoring primitives; `FunctionBundle`, `HarnessAdapter`, and `SurfaceRuntimePlan` are internal/lowering terms. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:431-510` and `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:1931-2164`.

## DX Findings

1. Alt-X-2 has the better public naming model.
   The three-level naming split is the strongest DX contribution in either spec: runtime internals use concrete engineering terms, adapters use native/framework terms, and public authoring uses behavior/intent terms. This prevents authors from needing to understand Effect layers, function bundles, or harness adapters before they can define an app/plugin/resource. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:433-510`.

2. Replace "runtime view" as a live-access term with `RuntimeAccess`.
   The current realization spec uses "runtime views" as the runtime-owned access surface and even gives resources a `view` contribution. Evidence: `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:179`, `:561-647`, `:2749-2798`. Alt-X-2 explicitly reserves "view" for diagnostics/topology and names live access `RuntimeAccess`, with `ProcessRuntimeAccess` and `RoleRuntimeAccess` for access scopes. That is cleaner and should supersede current terminology. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:180-184` and `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:1022-1113`.

3. Keep `RuntimeCatalog` as the public diagnostic noun.
   Alt-X-2's "runtime topology catalog" is accurate, but it never names `RuntimeCatalog`; Alt-X-1 and the current spec do. The synthesis should say: `RuntimeCatalog` is the diagnostic topology/read model emitted by runtime realization. "Topology catalog" describes its contents, not a second public noun. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md:306-336`, `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:2615-2658`, and `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md:2992-3011`.

4. Prefer `useService(...)` for plugin authors; reserve `bindService(...)` for runtime/SDK binding.
   Current code exposes a pre-Effect `bindService(...)` seam using `ProcessView` and `RoleView`. Evidence: `packages/hq-sdk/src/plugins.ts:1-10`, `:12-31`, and `:84-114`. That is useful migration scaffolding, but Alt-X-2 gives better author DX by having plugin authors declare `services: { todo: useService(TodoService) }`, then letting the SDK/runtime construct the correct client. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:1722-1732` and `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:1791-1813`. The synthesized spec should still define `bindService` as the runtime operation/cache seam, not the normal plugin-authoring gesture.

5. Prefer `startApp({ app, profile, roles })` as the final app-runtime API, with `startAppRole(...)` only as a narrow M2 convenience if needed.
   M2 currently names `startAppRole(...)` as a required public seam. Evidence: `docs/projects/rawr-final-architecture-migration/resources/RAWR_Architecture_Migration_Plan.md:967`, `:1091-1097`, and `docs/projects/rawr-final-architecture-migration/milestones/M2-minimal-canonical-runtime-shell.md:82`. Alt-X-2's `startApp({ app, profile, roles })` reads better because "role" is selected data, not a distinct operation. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:2375-2415`. If M2 keeps `startAppRole`, it should be a thin wrapper over the plural/array form, not the canonical mental model.

6. Profile fields should say `providers` or `providerSelections`, not `resources`, if the array contains provider selections.
   Alt-X-2's profile examples are otherwise stronger, but `resources: ProviderSelection[]` blurs resource requirements with provider choices. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-2.md:951-1018`. Alt-X-1 is more precise here with `providers: ProviderSelection[]`, and its "profile selects; it does not acquire" sentence is worth carrying. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md:859-914`.

## Terms to Carry Forward

Use these terms as canonical public or near-public DX terms:

- `RuntimeResource`, `RuntimeProvider`, `RuntimeProfile`
- `RuntimeAccess`, `ProcessRuntimeAccess`, `RoleRuntimeAccess`
- `RuntimeCatalog`
- `Service`, `ServicePackage`, `PluginDefinition`, `PluginFactory`, `AppDefinition`, `Entrypoint`
- `WorkflowDefinition`, `ScheduleDefinition`, `ConsumerDefinition`
- `runtime compiler`, `compiled process plan`, `bootgraph`, `Effect provisioning kernel`, `process runtime`, `harness`

Use these as internal or harness-facing terms only:

- `FunctionBundle`
- `HarnessAdapter`
- `SurfaceRuntimePlan`
- `ProviderPlan`
- `EffectLayer`, `ManagedRuntime`, `Scope`, `Fiber`

Avoid these as canonical public terms:

- `runtime view` for live access
- broad `View` nouns except diagnostics/topology
- `APIDefinition` / `InternalAPIDefinition` unless a real public type needs that exact name
- "adapter kind" fields in public plugin authoring
- `resources` as a runtime-profile field when the value is provider selections
- narrative flourishes such as "geometry" or "unlock" in normative spec sections

## Suggested Synthesis Rules

1. Start the synthesized spec with Alt-X-2 sections 1-2: what stable architecture answers, what runtime realization answers, and the ownership/direction/topology laws.
2. Use Alt-X-2 section 4 as the naming contract, but move `RuntimeCatalog` into Level 2 public/diagnostic names.
3. Replace current "runtime views" with `RuntimeAccess`; keep "view" only for diagnostic/topology projections.
4. Keep Alt-X-1's four-phase lifecycle: definition, selection, derivation, provisioning. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md:2823-2843`.
5. Keep Alt-X-1's stable-flexibility section as the decision boundary for what can vary without renegotiating architecture. Evidence: `/Users/mateicanavra/Downloads/RAWR_Runtime_Realization_System-Alt-X-1.md:2914-2937`.
6. Keep M2's `defineApp(...)`, `startAppRole(...)`, and `bindService(...)` references only after mapping them to final names:
   - `defineApp(...)`: canonical app composition.
   - `startApp(...)`: canonical entrypoint start API; `startAppRole(...)` may be a convenience wrapper.
   - `useService(...)`: author-facing plugin declaration.
   - `bindService(...)`: runtime/SDK service binding operation.
7. Treat `ProcessView` and `RoleView` as transitional names. Current code uses them, but the final spec should use `ProcessRuntimeAccess` / `RoleRuntimeAccess` for live access and `RuntimeCatalog` for diagnostics.

## Bottom Line

Alt-X-2 wins the terminology/DX comparison, but the best forward path is not to adopt it verbatim. Use Alt-X-2 as the structural spine, carry forward Alt-X-1's strongest lifecycle and flexibility language, keep `RuntimeCatalog`, keep profile provider-selection wording precise, and demote all live "view" language to diagnostics only.
