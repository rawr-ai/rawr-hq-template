export const RAWR_SDK_TOPOLOGY = "packages/core/sdk" as const;

export { defineApp, startApp } from "./app";
export type { AppDefinition, StartAppOptions, StartedApp } from "./app";
export {
  Effect,
  TaggedError,
  makeRawrEffect,
  makeRawrFailure,
  pipe,
} from "./effect";
export type {
  EffectBody,
  RawrConcurrencyPolicy,
  RawrEffect,
  RawrEffectError,
  RawrEffectRequirements,
  RawrEffectSuccess,
  RawrEffectYield,
  RawrRetryPolicy,
  RawrTimeoutPolicy,
} from "./effect";
export type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  ExecutionBoundaryKind,
  ExecutionDescriptor,
  ExecutionDescriptorRef,
  PublicServerRequestContext,
  RuntimeResourceAccess,
  WorkflowDispatcher,
} from "./execution";
export {
  defineService,
  resourceDep,
  semanticDep,
  serviceDep,
  toResourceRequirement,
  useService,
} from "./service";
export type {
  ResourceDependency,
  SemanticDependency,
  ServiceDefinition,
  ServiceDependency,
  ServiceOf,
  ServiceUse,
  ServiceUses,
} from "./service";
export { defineRuntimeResource, resourceRequirement } from "./runtime/resources";
export type {
  AppRole,
  ResourceLifetime,
  ResourceRequirement,
  RuntimeDiagnosticContributor,
  RuntimeResource,
  RuntimeResourceValue,
} from "./runtime/resources";
export { defineRuntimeProvider } from "./runtime/providers";
export type {
  ProviderBuildContext,
  ProviderScope,
  RuntimeProvider,
  RuntimeProviderHealthDescriptor,
} from "./runtime/providers";
export { providerFx } from "./runtime/providers/effect";
export type { ProviderEffectPlan, ProviderFx } from "./runtime/providers/effect";
export { defineRuntimeProfile, providerSelection } from "./runtime/profiles";
export type { ConfigSource, ProviderSelection, RuntimeProfile } from "./runtime/profiles";
export { RuntimeSchema, defineRuntimeSchema } from "./runtime/schema";
export type { RuntimeSchemaValue } from "./runtime/schema";
