export type {
  AppRole,
  HarnessDescriptor,
  HarnessFinding,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessHealthStatus,
  HarnessMountInput,
  HarnessReportSink,
  NativeHarnessHandle,
  ProcessRuntimeAccess,
  RequiredResourceReadiness,
  RequiredResourceReadinessRecord,
  RuntimeLaunchIdentity,
} from "../../../../runtime/harnesses/src/index";
export type { LoweredAgentTool } from "../../../../runtime/process-runtime/src/adapters/agent-tools";
export type { LoweredDesktopBackground } from "../../../../runtime/process-runtime/src/adapters/desktop-background";
export type { LoweredCliCommand } from "../../../../runtime/process-runtime/src/adapters/oclif";
export type { MountReadySurfaceRuntimeRecord } from "../../../../runtime/process-runtime/src/mount-ready-process";
export type {
  AgentToolMountRecord,
  CliCommandMountRecord,
  DesktopBackgroundMountRecord,
  NativeIntegrationHarness,
  ServerMountRecord,
} from "../../app/integrations";
