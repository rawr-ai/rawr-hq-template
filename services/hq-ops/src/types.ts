/**
 * @fileoverview Public DTO aliases for HQ Ops projection consumers.
 *
 * @remarks
 * Keep this intentionally sparse. Add aliases only when a projection needs a
 * stable DTO name that should be owned by the service package.
 */
import type { Client } from "./client";

export type {
  PluginInstallAction,
  PluginInstallDriftIssue,
  PluginInstallExpectedLink,
  PluginInstallManagerEntry,
  PluginInstallRuntimeSnapshot,
  PluginInstallStateStatus,
} from "./service/modules/plugin-install/entities";
export type {
  PluginInstallRepairPlan,
  PluginInstallStateReport,
} from "./service/modules/plugin-install/contract";

type AsyncReturn<T> = T extends (...args: infer _Args) => infer TResult ? Awaited<TResult> : never;

export type ResolveLifecycleTargetInput = Parameters<Client["pluginLifecycle"]["resolveLifecycleTarget"]>[0];
export type ResolveLifecycleTargetResult = AsyncReturn<Client["pluginLifecycle"]["resolveLifecycleTarget"]>;
export type EvaluateLifecycleCompletenessInput = Parameters<Client["pluginLifecycle"]["evaluateLifecycleCompleteness"]>[0];
export type LifecycleCheckData = AsyncReturn<Client["pluginLifecycle"]["evaluateLifecycleCompleteness"]>;
export type LifecycleTarget = LifecycleCheckData["target"];
export type LifecycleType = LifecycleTarget["type"];
export type ScratchPolicyCheckInput = Parameters<Client["pluginLifecycle"]["checkScratchPolicy"]>[0];
export type ScratchPolicyCheck = AsyncReturn<Client["pluginLifecycle"]["checkScratchPolicy"]>;
export type ScratchPolicyMode = NonNullable<ScratchPolicyCheckInput["mode"]>;
export type DecideMergePolicyInput = Parameters<Client["pluginLifecycle"]["decideMergePolicy"]>[0];
export type DecideMergePolicyResult = AsyncReturn<Client["pluginLifecycle"]["decideMergePolicy"]>;
export type JudgeResult = DecideMergePolicyResult["policyAssessment"]["judge1"];
export type PrContext = DecideMergePolicyResult["prContext"];
