import { randomUUID } from "node:crypto";
import path from "node:path";

import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import type {
  ControllerExecutableAuthority,
  ControllerProviderHomeAuthority,
} from "@rawr/resource-controller-authority";
import { preflightNodeControllerAuthority } from "@rawr/resource-controller-authority/providers/effect-platform-node";
import type { UndoResult } from "../undo";
import { createProductionLifecycleClient } from "../service-runtime/client";
import { createProductionAgentPluginUndo } from "../service-runtime/undo";
import {
  LifecycleAuthorityBindingError,
  type ControllerProjectionBinding,
  type LifecycleClientFactory,
  type LifecycleOperation,
} from "./binding";

import type {
  AttestPromotionRequest,
  BuildRequest,
  CheckRequest,
  CompleteTestRequest,
  ExportRequest,
  PackageRequest,
  RetireRequest,
  StatusRequest,
  SyncRequest,
  TargetedTestRequest,
  VendorStatusRequest,
  VendorUpdateRequest,
} from "./input";
import { LifecycleInputError } from "./input";

export type LifecycleOperationRequest =
  | Readonly<{ operation: "releases.check"; input: CheckRequest }>
  | Readonly<{ operation: "releases.build"; input: BuildRequest }>
  | Readonly<{ operation: "vendors.status"; input: VendorStatusRequest }>
  | Readonly<{ operation: "vendors.update"; input: VendorUpdateRequest }>
  | Readonly<{ operation: "packaging.package"; input: PackageRequest }>
  | Readonly<{ operation: "exports.apply"; input: ExportRequest }>
  | Readonly<{ operation: "providers.targetedTest"; input: TargetedTestRequest }>
  | Readonly<{ operation: "providers.completeTest"; input: CompleteTestRequest }>
  | Readonly<{ operation: "providers.canonicalSync"; input: SyncRequest }>
  | Readonly<{ operation: "providers.canonicalStatus"; input: StatusRequest }>
  | Readonly<{ operation: "providers.managedRetire"; input: RetireRequest }>
  | Readonly<{ operation: "governance.attestPromotion"; input: AttestPromotionRequest }>;

export type UndoApplication = (binding: ControllerProjectionBinding) => Promise<UndoResult>;
type LifecycleCallOptions = NonNullable<Parameters<Client["releases"]["check"]>[1]>;

export {
  LifecycleAuthorityBindingError,
  type ControllerProjectionBinding,
  type LifecycleClientFactory,
  type LifecycleOperation,
} from "./binding";

export function parseControllerProjectionBinding(
  flags: Readonly<Record<string, unknown>>,
  requirements: Readonly<{
    git?: boolean;
    hostedGovernance?: boolean;
    providers?: readonly ("claude" | "codex")[];
    admittedProviders?: readonly ("claude" | "codex")[];
  }> = {},
): ControllerProjectionBinding {
  const gitExecutable = optionalAbsoluteExecutable(flags["git-executable"], "--git-executable");
  if (requirements.git && gitExecutable === undefined) {
    throw new LifecycleInputError("--git-executable is required for this command");
  }
  if (!requirements.git && gitExecutable !== undefined) {
    throw new LifecycleInputError("--git-executable is not admitted by this command");
  }
  const hostedGovernanceExecutable = optionalAbsoluteExecutable(
    flags["hosted-governance-executable"],
    "--hosted-governance-executable",
  );
  if (requirements.hostedGovernance && hostedGovernanceExecutable === undefined) {
    throw new LifecycleInputError("--hosted-governance-executable is required for this command");
  }
  if (!requirements.hostedGovernance && hostedGovernanceExecutable !== undefined) {
    throw new LifecycleInputError("--hosted-governance-executable is not admitted by this command");
  }
  const providerExecutables = parseProviderExecutables(flags["provider-executable"]);
  const requiredProviders = requirements.providers ?? [];
  const admittedProviders = requirements.admittedProviders ?? requiredProviders;
  for (const provider of requiredProviders) {
    if (providerExecutables[provider] === undefined) {
      throw new LifecycleInputError(`--provider-executable ${provider}=<absolute-path> is required`);
    }
  }
  for (const provider of Object.keys(providerExecutables) as ("claude" | "codex")[]) {
    if (!admittedProviders.includes(provider)) {
      throw new LifecycleInputError(`--provider-executable ${provider}=... is not selected by this command`);
    }
  }
  return Object.freeze({
    ...(gitExecutable === undefined ? {} : { gitExecutable }),
    ...(hostedGovernanceExecutable === undefined ? {} : { hostedGovernanceExecutable }),
    providerExecutables: Object.freeze(providerExecutables),
  });
}

export async function projectLifecycleOperation(
  request: LifecycleOperationRequest,
  binding: ControllerProjectionBinding,
  factory: LifecycleClientFactory = createProductionLifecycleClient,
): Promise<unknown> {
  await preflightLifecycleAuthority(request, binding);
  const client = await factory(request.operation, binding);
  return invokeLifecycleProcedure(client, request);
}

export async function invokeLifecycleProcedure(
  client: Client,
  request: LifecycleOperationRequest,
): Promise<unknown> {
  const callOptions = invocation(request.operation);
  switch (request.operation) {
    case "releases.check":
      return await client.releases.check(request.input, callOptions);
    case "releases.build":
      return await client.releases.build(request.input, callOptions);
    case "vendors.status":
      return await client.vendors.status(request.input, callOptions);
    case "vendors.update":
      return await client.vendors.update(request.input, callOptions);
    case "packaging.package":
      return await client.packaging.package(request.input, callOptions);
    case "exports.apply":
      return await client.exports.apply(request.input, callOptions);
    case "providers.targetedTest":
      return await client.providers.targetedTest(request.input, callOptions);
    case "providers.completeTest":
      return await client.providers.completeTest(request.input, callOptions);
    case "providers.canonicalSync":
      return await client.providers.canonicalSync(request.input, callOptions);
    case "providers.canonicalStatus":
      return await client.providers.canonicalStatus(request.input, callOptions);
    case "providers.managedRetire":
      return await client.providers.managedRetire(request.input, callOptions);
    case "governance.attestPromotion":
      return await client.governance.attestPromotion(request.input, callOptions);
  }
}

export async function invokeAgentPluginUndo(
  binding: ControllerProjectionBinding,
  application: UndoApplication = createProductionAgentPluginUndo,
): Promise<UndoResult> {
  await preflightBindingAuthority(binding, []);
  return application(binding);
}

export function lifecycleResultExitCode(
  operation: LifecycleOperation,
  result: unknown,
): 0 | 1 {
  const record = asRecord(result);
  if (operation === "providers.canonicalStatus") {
    if (record.ok !== true || !Array.isArray(record.value)) return 1;
    return record.value.every((entry) => asRecord(entry).status === "CONVERGED") ? 0 : 1;
  }
  if (operation.startsWith("providers.")) {
    if (record.ok !== true) return 1;
    const value = asRecord(record.value);
    return value.status === "Blocked" || value.status === "Failed" || value.status === "PartialFailure" ? 1 : 0;
  }
  const successfulKinds: Readonly<Record<LifecycleOperation, readonly string[]>> = {
    "releases.check": ["EligibleReport"],
    "releases.build": ["Published", "ReadOnlyConverged"],
    "vendors.status": ["VendorStatus"],
    "vendors.update": ["ReadOnlyConverged", "AuthoredReviewableChanges"],
    "packaging.package": ["ReadOnlyConverged", "OutputReplacedVerified"],
    "exports.apply": ["ReadOnlyConverged", "MutatedSettled"],
    "providers.targetedTest": [],
    "providers.completeTest": [],
    "providers.canonicalSync": [],
    "providers.canonicalStatus": [],
    "providers.managedRetire": [],
    "governance.attestPromotion": ["PromotionAttested"],
  };
  return successfulKinds[operation].includes(String(record.kind)) ? 0 : 1;
}

export function undoResultExitCode(result: UndoResult): 0 | 1 {
  return result.kind === "NoCommittedCapsule" || result.kind === "RestoredAndCleared" ? 0 : 1;
}

function invocation(operation: LifecycleOperation) {
  const identity = randomUUID();
  return {
    context: {
      invocation: {
        traceId: `agent-plugin-lifecycle:${identity}`,
        commandId: `${operation}:${identity}`,
      },
    },
  } satisfies LifecycleCallOptions;
}

async function preflightLifecycleAuthority(
  request: LifecycleOperationRequest,
  binding: ControllerProjectionBinding,
): Promise<void> {
  await preflightBindingAuthority(binding, providerHomes(request));
}

async function preflightBindingAuthority(
  binding: ControllerProjectionBinding,
  homes: readonly ControllerProviderHomeAuthority[],
): Promise<void> {
  const executables: ControllerExecutableAuthority[] = [];
  if (binding.gitExecutable !== undefined) {
    executables.push({ kind: "git", name: "git", path: binding.gitExecutable });
  }
  if (binding.hostedGovernanceExecutable !== undefined) {
    executables.push({
      kind: "hosted-governance",
      name: "hosted-governance",
      path: binding.hostedGovernanceExecutable,
    });
  }
  const providerNames: readonly ("claude" | "codex")[] = ["claude", "codex"];
  for (const provider of providerNames) {
    const executable = binding.providerExecutables[provider];
    if (executable !== undefined) {
      executables.push({ kind: "provider", name: provider, path: executable });
    }
  }
  const result = await preflightNodeControllerAuthority({ executables, providerHomes: homes });
  if (result.ok) return;
  if (result.failure.boundary === "provider-home") {
    throw new LifecycleInputError(result.failure.detail);
  }
  throw new LifecycleAuthorityBindingError(result.failure.detail);
}

function providerHomes(request: LifecycleOperationRequest): readonly ControllerProviderHomeAuthority[] {
  switch (request.operation) {
    case "providers.targetedTest":
    case "providers.completeTest":
    case "providers.canonicalSync":
    case "providers.canonicalStatus":
    case "providers.managedRetire":
      return request.input.targets.map((target) => ({
        provider: target.provider,
        path: target.home,
      }));
    default:
      return [];
  }
}

function parseProviderExecutables(input: unknown): Partial<Record<"claude" | "codex", string>> {
  const values = input === undefined ? [] : Array.isArray(input) ? input : [input];
  const result: Partial<Record<"claude" | "codex", string>> = {};
  for (const raw of values) {
    if (typeof raw !== "string") throw new LifecycleInputError("--provider-executable must be a string");
    const separator = raw.indexOf("=");
    if (separator <= 0 || separator !== raw.lastIndexOf("=")) {
      throw new LifecycleInputError("--provider-executable must use provider=absolute-path");
    }
    const provider = raw.slice(0, separator);
    if (provider !== "claude" && provider !== "codex") {
      throw new LifecycleInputError("--provider-executable provider must be claude or codex");
    }
    if (result[provider] !== undefined) throw new LifecycleInputError(`Duplicate ${provider} executable binding`);
    result[provider] = requireAbsoluteExecutable(raw.slice(separator + 1), "--provider-executable");
  }
  return result;
}

function optionalAbsoluteExecutable(input: unknown, label: string): string | undefined {
  return input === undefined ? undefined : requireAbsoluteExecutable(input, label);
}

function requireAbsoluteExecutable(input: unknown, label: string): string {
  if (typeof input !== "string" || input.length === 0 || input.includes("\0")) {
    throw new LifecycleInputError(`${label} must be a bounded absolute executable path`);
  }
  if (
    !path.isAbsolute(input)
    || path.normalize(input) !== input
    || path.resolve(input) !== input
    || input === path.parse(input).root
  ) {
    throw new LifecycleInputError(`${label} must be an absolute lexically canonical non-root path`);
  }
  return input;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
