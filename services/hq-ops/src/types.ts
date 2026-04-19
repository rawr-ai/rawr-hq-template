/**
 * @fileoverview Public DTO aliases for HQ Ops projection consumers.
 *
 * @remarks
 * Keep this intentionally sparse. Add aliases only when a projection needs a
 * stable DTO name that should be owned by the service package.
 */
export type {
  PluginInstallAction,
  PluginInstallAssessInput,
  PluginInstallDriftIssue,
  PluginInstallExpectedLink,
  PluginInstallManagerEntry,
  PluginInstallRepairCommand,
  PluginInstallRepairInput,
  PluginInstallRepairPlan,
  PluginInstallRuntimeSnapshot,
  PluginInstallStateReport,
  PluginInstallStateStatus,
} from "./service/modules/plugin-install/model";

export type {
  DecideMergePolicyInput,
  DecideMergePolicyResult,
  EvaluateLifecycleCompletenessInput,
  JudgeResult,
  LifecycleCheckData,
  LifecycleTarget,
  LifecycleType,
  PrContext,
  ResolveLifecycleTargetInput,
  ResolveLifecycleTargetResult,
  ScratchPolicyCheck,
  ScratchPolicyCheckInput,
} from "./service/modules/plugin-lifecycle/model";
