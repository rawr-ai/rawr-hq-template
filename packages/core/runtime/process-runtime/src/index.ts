export { createAgentToolsAdapter, type LoweredAgentTool } from "./adapters/agent-tools";
export {
  createDesktopBackgroundAdapter,
  type LoweredDesktopBackground,
} from "./adapters/desktop-background";
export { createOclifAdapter, type LoweredCliCommand } from "./adapters/oclif";
export {
  type CreateProcessRuntimeInput,
  createProcessRuntime,
  type ProcessRuntime,
} from "./create-process-runtime";
export {
  type CompiledExecutableBoundary,
  createExecutionRegistry,
  type ExecutionRegistry,
} from "./execution-registry";
export type { ProcessExecutionRuntime } from "./execution-runtime";
export {
  createMountPreparation,
  type MountReadyProcess,
  type MountReadyProcessHandoff,
  MountReadySurfaceMetadataSchema,
  type MountReadySurfaceRuntimeRecord,
  type MountResourceReadiness,
  MountResourceReadinessSchema,
  type PrepareMountsInput,
  readMountReadyProcessHandoff,
  readMountReadySurfaceRuntimeRecord,
  type SurfaceMountAssignment,
} from "./mount-ready-process";
export type {
  ProcessRuntimeAccess,
  RoleRuntimeAccess,
  RoleSurfaceIdentity,
  RuntimeAccess,
  SurfaceRuntimeAccess,
} from "./runtime-access";
export type {
  AdapterFinding,
  AdapterLoweringResult,
  AdapterObservation,
  BoundServiceBindingMap,
  SurfaceAdapter,
} from "./surface-adapter";
