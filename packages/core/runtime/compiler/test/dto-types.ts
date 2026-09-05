import type { Static } from "typebox";
import {
  type BootgraphInput,
  BootgraphInputSchema,
  type CompilationObservationSeed,
  CompilationObservationSeedSchema,
  type CompiledExecutableBoundaryInput,
  CompiledExecutableBoundaryInputSchema,
  type CompiledExecutionPlan,
  CompiledExecutionPlanSchema,
  type CompiledExecutionRegistryInput,
  CompiledExecutionRegistryInputSchema,
  type CompiledHarnessPlan,
  CompiledHarnessPlanSchema,
  type CompiledProcessPlan,
  CompiledProcessPlanSchema,
  type CompiledResourceBinding,
  CompiledResourceBindingSchema,
  type CompiledResourcePlan,
  CompiledResourcePlanSchema,
  type CompiledServiceBindingPlan,
  CompiledServiceBindingPlanSchema,
  type CompiledSurfacePlan,
  CompiledSurfacePlanSchema,
  type CompiledWorkflowDispatcherPlan,
  CompiledWorkflowDispatcherPlanSchema,
  compileRuntimePlan,
  type ProviderDependencyClosure,
  ProviderDependencyClosureSchema,
  type ProviderDependencyEdge,
  ProviderDependencyEdgeSchema,
  type ProviderDependencyGraph,
  ProviderDependencyGraphSchema,
  type ProviderDependencyNode,
  ProviderDependencyNodeSchema,
  type RuntimeCompilationInput,
  type RuntimeCompilationResult,
} from "../src/index";

type AssertNever<T extends never> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type IsExact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;
type IsExactNonNever<Left, Right> =
  IsNever<Left> extends true ? false : IsNever<Right> extends true ? false : IsExact<Left, Right>;
type DeepReadonly<Value> = Value extends readonly unknown[]
  ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;
type IsDeepReadonlyNonAnyNonNever<Value> =
  IsAny<Value> extends true
    ? false
    : IsNever<Value> extends true
      ? false
      : IsExact<Value, DeepReadonly<Value>>;

export const EXACT_COMPILER_DTO_TYPE_ORACLES = {
  bootgraphInput: true,
  compilationObservationSeed: true,
  compiledExecutableBoundaryInput: true,
  compiledExecutionPlan: true,
  compiledExecutionRegistryInput: true,
  compiledHarnessPlan: true,
  compiledProcessPlan: true,
  compiledResourceBinding: true,
  compiledResourcePlan: true,
  compiledServiceBindingPlan: true,
  compiledSurfacePlan: true,
  compiledWorkflowDispatcherPlan: true,
  providerDependencyClosure: true,
  providerDependencyEdge: true,
  providerDependencyGraph: true,
  providerDependencyNode: true,
} satisfies {
  readonly bootgraphInput: IsExactNonNever<BootgraphInput, Static<typeof BootgraphInputSchema>>;
  readonly compilationObservationSeed: IsExactNonNever<
    CompilationObservationSeed,
    Static<typeof CompilationObservationSeedSchema>
  >;
  readonly compiledExecutableBoundaryInput: IsExactNonNever<
    CompiledExecutableBoundaryInput,
    Static<typeof CompiledExecutableBoundaryInputSchema>
  >;
  readonly compiledExecutionPlan: IsExactNonNever<
    CompiledExecutionPlan,
    Static<typeof CompiledExecutionPlanSchema>
  >;
  readonly compiledExecutionRegistryInput: IsExactNonNever<
    CompiledExecutionRegistryInput,
    Static<typeof CompiledExecutionRegistryInputSchema>
  >;
  readonly compiledHarnessPlan: IsExactNonNever<
    CompiledHarnessPlan,
    Static<typeof CompiledHarnessPlanSchema>
  >;
  readonly compiledProcessPlan: IsExactNonNever<
    CompiledProcessPlan,
    Static<typeof CompiledProcessPlanSchema>
  >;
  readonly compiledResourceBinding: IsExactNonNever<
    CompiledResourceBinding,
    Static<typeof CompiledResourceBindingSchema>
  >;
  readonly compiledResourcePlan: IsExactNonNever<
    CompiledResourcePlan,
    Static<typeof CompiledResourcePlanSchema>
  >;
  readonly compiledServiceBindingPlan: IsExactNonNever<
    CompiledServiceBindingPlan,
    Static<typeof CompiledServiceBindingPlanSchema>
  >;
  readonly compiledSurfacePlan: IsExactNonNever<
    CompiledSurfacePlan,
    Static<typeof CompiledSurfacePlanSchema>
  >;
  readonly compiledWorkflowDispatcherPlan: IsExactNonNever<
    CompiledWorkflowDispatcherPlan,
    Static<typeof CompiledWorkflowDispatcherPlanSchema>
  >;
  readonly providerDependencyClosure: IsExactNonNever<
    ProviderDependencyClosure,
    Static<typeof ProviderDependencyClosureSchema>
  >;
  readonly providerDependencyEdge: IsExactNonNever<
    ProviderDependencyEdge,
    Static<typeof ProviderDependencyEdgeSchema>
  >;
  readonly providerDependencyGraph: IsExactNonNever<
    ProviderDependencyGraph,
    Static<typeof ProviderDependencyGraphSchema>
  >;
  readonly providerDependencyNode: IsExactNonNever<
    ProviderDependencyNode,
    Static<typeof ProviderDependencyNodeSchema>
  >;
};

export const DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES = {
  bootgraphInput: true,
  compilationObservationSeed: true,
  compiledExecutableBoundaryInput: true,
  compiledExecutionPlan: true,
  compiledExecutionRegistryInput: true,
  compiledHarnessPlan: true,
  compiledProcessPlan: true,
  compiledResourceBinding: true,
  compiledResourcePlan: true,
  compiledServiceBindingPlan: true,
  compiledSurfacePlan: true,
  compiledWorkflowDispatcherPlan: true,
  providerDependencyClosure: true,
  providerDependencyEdge: true,
  providerDependencyGraph: true,
  providerDependencyNode: true,
} satisfies {
  readonly bootgraphInput: IsDeepReadonlyNonAnyNonNever<BootgraphInput>;
  readonly compilationObservationSeed: IsDeepReadonlyNonAnyNonNever<CompilationObservationSeed>;
  readonly compiledExecutableBoundaryInput: IsDeepReadonlyNonAnyNonNever<CompiledExecutableBoundaryInput>;
  readonly compiledExecutionPlan: IsDeepReadonlyNonAnyNonNever<CompiledExecutionPlan>;
  readonly compiledExecutionRegistryInput: IsDeepReadonlyNonAnyNonNever<CompiledExecutionRegistryInput>;
  readonly compiledHarnessPlan: IsDeepReadonlyNonAnyNonNever<CompiledHarnessPlan>;
  readonly compiledProcessPlan: IsDeepReadonlyNonAnyNonNever<CompiledProcessPlan>;
  readonly compiledResourceBinding: IsDeepReadonlyNonAnyNonNever<CompiledResourceBinding>;
  readonly compiledResourcePlan: IsDeepReadonlyNonAnyNonNever<CompiledResourcePlan>;
  readonly compiledServiceBindingPlan: IsDeepReadonlyNonAnyNonNever<CompiledServiceBindingPlan>;
  readonly compiledSurfacePlan: IsDeepReadonlyNonAnyNonNever<CompiledSurfacePlan>;
  readonly compiledWorkflowDispatcherPlan: IsDeepReadonlyNonAnyNonNever<CompiledWorkflowDispatcherPlan>;
  readonly providerDependencyClosure: IsDeepReadonlyNonAnyNonNever<ProviderDependencyClosure>;
  readonly providerDependencyEdge: IsDeepReadonlyNonAnyNonNever<ProviderDependencyEdge>;
  readonly providerDependencyGraph: IsDeepReadonlyNonAnyNonNever<ProviderDependencyGraph>;
  readonly providerDependencyNode: IsDeepReadonlyNonAnyNonNever<ProviderDependencyNode>;
};

type ObservationPortInputKey = AssertNever<
  Extract<"observationPort", keyof RuntimeCompilationInput>
>;
type ForbiddenCompilationResultKey = AssertNever<
  Extract<"findings" | "diagnostics", keyof RuntimeCompilationResult>
>;
type ForbiddenCompiledPlanKey = AssertNever<
  Extract<"findings" | "diagnostics" | "observationSeed", keyof CompiledProcessPlan>
>;

// @ts-expect-error The compiler intentionally exposes no finding type.
type CompilationFindingMustRemainAbsent = import("../src/index").CompilationFinding;
