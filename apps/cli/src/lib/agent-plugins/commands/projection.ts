import { randomUUID } from "node:crypto";
import path from "node:path";

import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import type {
  ControllerExecutableAuthority,
} from "@rawr/resource-controller-authority";
import { preflightNodeControllerAuthority } from "@rawr/resource-controller-authority/providers/effect-platform-node";
import { createProductionLifecycleClient } from "../service-runtime/client";
import {
  type ControllerProjectionBinding,
  LifecycleAuthorityBindingError,
  type LifecycleClientFactory,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "./binding";

import type {
  BuildRequest,
  CheckRequest,
  CurrentMainRecordRequest,
  CurrentMainSelectionRequest,
  PackageRequest,
  ReleaseInputRecordRequest,
  ReleaseInputRefreshRequest,
  RepositoryCheckRequest,
  StatusRequest,
  SyncRequest,
  TestRequest,
  VendorStatusRequest,
  VendorUpdateRequest,
} from "./input";
import { LifecycleInputError } from "./input";

export type LifecycleOperationRequest =
  | Readonly<{ operation: "releases.check"; input: CheckRequest }>
  | Readonly<{ operation: "releases.checkRepository"; input: RepositoryCheckRequest }>
  | Readonly<{ operation: "releases.releaseInputRecord"; input: ReleaseInputRecordRequest }>
  | Readonly<{
      operation: "releases.refreshReleaseInput";
      input: ReleaseInputRefreshRequest;
    }>
  | Readonly<{ operation: "releases.build"; input: BuildRequest }>
  | Readonly<{ operation: "vendors.status"; input: VendorStatusRequest }>
  | Readonly<{ operation: "vendors.update"; input: VendorUpdateRequest }>
  | Readonly<{ operation: "packaging.package"; input: PackageRequest }>
  | Readonly<{ operation: "providers.test"; input: TestRequest }>
  | Readonly<{ operation: "providers.sync"; input: SyncRequest }>
  | Readonly<{ operation: "providers.status"; input: StatusRequest }>
  | Readonly<{ operation: "governance.currentMainRecord"; input: CurrentMainRecordRequest }>
  | Readonly<{
      operation: "governance.currentMainSelection";
      input: CurrentMainSelectionRequest;
    }>;

type LifecycleCallOptions = NonNullable<Parameters<Client["releases"]["check"]>[1]>;

export {
  type ControllerProjectionBinding,
  LifecycleAuthorityBindingError,
  type LifecycleClientFactory,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "./binding";

export function parseControllerProjectionBinding(
  flags: Readonly<Record<string, unknown>>,
  requirements: Readonly<{
    git?: boolean;
    providers?: readonly ("claude" | "codex")[];
    admittedProviders?: readonly ("claude" | "codex")[];
  }> = {}
): ControllerProjectionBinding {
  const gitExecutable = optionalAbsoluteExecutable(flags["git-executable"], "--git-executable");
  if (requirements.git && gitExecutable === undefined) {
    throw new LifecycleInputError("--git-executable is required for this command");
  }
  if (!requirements.git && gitExecutable !== undefined) {
    throw new LifecycleInputError("--git-executable is not admitted by this command");
  }
  const providerExecutables = parseProviderExecutables(flags["provider-executable"]);
  const requiredProviders = requirements.providers ?? [];
  const admittedProviders = requirements.admittedProviders ?? requiredProviders;
  for (const provider of requiredProviders) {
    if (providerExecutables[provider] === undefined) {
      throw new LifecycleInputError(
        `--provider-executable ${provider}=<absolute-path> is required`
      );
    }
  }
  for (const provider of Object.keys(providerExecutables) as ("claude" | "codex")[]) {
    if (!admittedProviders.includes(provider)) {
      throw new LifecycleInputError(
        `--provider-executable ${provider}=... is not selected by this command`
      );
    }
  }
  return Object.freeze({
    ...(gitExecutable === undefined ? {} : { gitExecutable }),
    providerExecutables: Object.freeze(providerExecutables),
  });
}

export async function projectLifecycleOperation(
  request: LifecycleOperationRequest,
  binding: ControllerProjectionBinding,
  factory: LifecycleClientFactory = createProductionLifecycleClient
): Promise<unknown> {
  await preflightLifecycleAuthority(request, binding);
  return invokeLifecycleProcedure(request, binding, factory);
}

export async function invokeLifecycleProcedure(
  request: LifecycleOperationRequest,
  binding: ControllerProjectionBinding,
  factory: LifecycleClientFactory
): Promise<unknown> {
  const callOptions = invocation(request.operation);
  switch (request.operation) {
    case "releases.check": {
      const client = await factory("releases.check", binding);
      return await client.releases.check(request.input, callOptions);
    }
    case "releases.checkRepository": {
      const client = await factory("releases.checkRepository", binding);
      return await client.releases.checkRepository(request.input, callOptions);
    }
    case "releases.releaseInputRecord": {
      const client = await factory("releases.releaseInputRecord", binding);
      return await client.releases.releaseInputRecord(request.input, callOptions);
    }
    case "releases.refreshReleaseInput": {
      const client = await factory("releases.refreshReleaseInput", binding);
      return await client.releases.refreshReleaseInput(request.input, callOptions);
    }
    case "releases.build": {
      const client = await factory("releases.build", binding);
      return await client.releases.build(request.input, callOptions);
    }
    case "vendors.status": {
      const client = await factory("vendors.status", binding);
      return await client.vendors.status(request.input, callOptions);
    }
    case "vendors.update": {
      const client = await factory("vendors.update", binding);
      return await client.vendors.update(request.input, callOptions);
    }
    case "packaging.package": {
      const client = await factory("packaging.package", binding);
      return await client.packaging.package(request.input, callOptions);
    }
    case "providers.test": {
      const client = await factory("providers.test", binding);
      return await client.providers.test(request.input, callOptions);
    }
    case "providers.sync": {
      const client = await factory("providers.sync", binding);
      return await client.providers.sync(request.input, callOptions);
    }
    case "providers.status": {
      const client = await factory("providers.status", binding);
      return await client.providers.status(request.input, callOptions);
    }
    case "governance.currentMainRecord": {
      const client = await factory("governance.currentMainRecord", binding);
      return await client.governance.currentMainRecord(request.input, callOptions);
    }
    case "governance.currentMainSelection": {
      const client = await factory("governance.currentMainSelection", binding);
      return await client.governance.currentMainSelection(request.input, callOptions);
    }
    default:
      return assertNever(request);
  }
}

export function lifecycleResultExitCode(operation: LifecycleOperation, result: unknown): 0 | 1 | 2 {
  const record = asRecord(result);
  if (operation.startsWith("providers.")) {
    if (record.classification === "Blocked") return 2;
    return record.classification === "Converged" || record.classification === "Changed"
      ? 0
      : 1;
  }
  if (operation === "releases.releaseInputRecord" || operation === "governance.currentMainRecord")
    return record.ok === true ? 0 : 1;
  if (operation === "releases.refreshReleaseInput") {
    return record.kind === "ReleaseInputCandidateReady" ||
      record.kind === "ReleaseInputReadOnlyConverged"
      ? 0
      : 1;
  }
  if (operation === "governance.currentMainSelection") {
    return record.kind === "CURRENT_ELIGIBLE" ? 0 : 2;
  }
  const successfulKinds: Readonly<Record<LifecycleOperation, readonly string[]>> = {
    "releases.check": ["EligibleReport"],
    "releases.checkRepository": ["StagedRepositoryEligible", "CleanRepositoryEligible"],
    "releases.releaseInputRecord": [],
    "releases.refreshReleaseInput": [],
    "releases.build": ["Published", "ReadOnlyConverged"],
    "vendors.status": ["VendorStatus"],
    "vendors.update": ["ReadOnlyConverged", "AuthoredReviewableChanges"],
    "packaging.package": ["ReadOnlyConverged", "OutputReplacedVerified"],
    "providers.test": [],
    "providers.sync": [],
    "providers.status": [],
    "governance.currentMainRecord": [],
    "governance.currentMainSelection": [],
  };
  return successfulKinds[operation].includes(String(record.kind)) ? 0 : 1;
}

export function projectLifecycleResultForOutput(
  operation: LifecycleOperation,
  result: unknown
): unknown {
  if (
    operation !== "releases.releaseInputRecord" &&
    operation !== "releases.refreshReleaseInput" &&
    operation !== "governance.currentMainRecord"
  )
    return result;
  const record = asRecord(result);
  const value =
    operation === "releases.refreshReleaseInput"
      ? record
      : record.ok === true
        ? asRecord(record.value)
        : undefined;
  if (value === undefined) return result;
  if (!(value.bytes instanceof Uint8Array)) return result;
  const { bytes, ...projectedValue } = value;
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const projected = Object.freeze({
    ...projectedValue,
    ...(operation === "governance.currentMainRecord"
      ? { recordText: text }
      : { envelopeText: text }),
  });
  return operation === "releases.refreshReleaseInput"
    ? projected
    : Object.freeze({ ...record, value: projected });
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
  binding: ControllerProjectionBinding
): Promise<void> {
  switch (request.operation) {
    case "providers.test":
    case "providers.sync":
    case "providers.status":
      return;
    default:
      await preflightBindingAuthority(binding);
  }
}

async function preflightBindingAuthority(binding: ControllerProjectionBinding): Promise<void> {
  const executables: ControllerExecutableAuthority[] = [];
  if (binding.gitExecutable !== undefined) {
    executables.push({ kind: "git", name: "git", path: binding.gitExecutable });
  }
  const providerNames: readonly ("claude" | "codex")[] = ["claude", "codex"];
  for (const provider of providerNames) {
    const executable = binding.providerExecutables[provider];
    if (executable !== undefined) {
      executables.push({ kind: "provider", name: provider, path: executable });
    }
  }
  const result = await preflightNodeControllerAuthority({ executables, providerHomes: [] });
  if (result.ok) return;
  if (result.failure.boundary === "provider-home") {
    throw new LifecycleInputError(result.failure.detail);
  }
  throw new LifecycleAuthorityBindingError(result.failure.detail);
}

function parseProviderExecutables(input: unknown): Partial<Record<"claude" | "codex", string>> {
  const values = input === undefined ? [] : Array.isArray(input) ? input : [input];
  const result: Partial<Record<"claude" | "codex", string>> = {};
  for (const raw of values) {
    if (typeof raw !== "string")
      throw new LifecycleInputError("--provider-executable must be a string");
    const separator = raw.indexOf("=");
    if (separator <= 0 || separator !== raw.lastIndexOf("=")) {
      throw new LifecycleInputError("--provider-executable must use provider=absolute-path");
    }
    const provider = raw.slice(0, separator);
    if (provider !== "claude" && provider !== "codex") {
      throw new LifecycleInputError("--provider-executable provider must be claude or codex");
    }
    if (result[provider] !== undefined)
      throw new LifecycleInputError(`Duplicate ${provider} executable binding`);
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
    !path.isAbsolute(input) ||
    path.normalize(input) !== input ||
    path.resolve(input) !== input ||
    input === path.parse(input).root
  ) {
    throw new LifecycleInputError(`${label} must be an absolute lexically canonical non-root path`);
  }
  return input;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function assertNever(value: never): never {
  throw new Error(`Unreachable lifecycle operation: ${String(value)}`);
}
