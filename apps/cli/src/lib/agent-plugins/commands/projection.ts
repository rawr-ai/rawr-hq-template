import { randomUUID } from "node:crypto";

import type { Client } from "@rawr/agent-plugin-lifecycle/client";
import { createProductionLifecycleClient } from "../service-runtime/client";
import {
  type LifecycleClientFactory,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "./binding";

import type {
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

export type LifecycleOperationRequest =
  | Readonly<{ operation: "releases.check"; input: CheckRequest }>
  | Readonly<{ operation: "releases.checkRepository"; input: RepositoryCheckRequest }>
  | Readonly<{ operation: "releases.releaseInputRecord"; input: ReleaseInputRecordRequest }>
  | Readonly<{
      operation: "releases.refreshReleaseInput";
      input: ReleaseInputRefreshRequest;
    }>
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
  type LifecycleClientFactory,
  type LifecycleOperation,
  type LifecycleOperationClient,
} from "./binding";

export async function projectLifecycleOperation(
  request: LifecycleOperationRequest,
  factory: LifecycleClientFactory = createProductionLifecycleClient
): Promise<unknown> {
  return invokeLifecycleProcedure(request, factory);
}

export async function invokeLifecycleProcedure(
  request: LifecycleOperationRequest,
  factory: LifecycleClientFactory
): Promise<unknown> {
  const callOptions = invocation(request.operation);
  switch (request.operation) {
    case "releases.check": {
      const client = await factory("releases.check");
      return await client.releases.check(request.input, callOptions);
    }
    case "releases.checkRepository": {
      const client = await factory("releases.checkRepository");
      return await client.releases.checkRepository(request.input, callOptions);
    }
    case "releases.releaseInputRecord": {
      const client = await factory("releases.releaseInputRecord");
      return await client.releases.releaseInputRecord(request.input, callOptions);
    }
    case "releases.refreshReleaseInput": {
      const client = await factory("releases.refreshReleaseInput");
      return await client.releases.refreshReleaseInput(request.input, callOptions);
    }
    case "vendors.status": {
      const client = await factory("vendors.status");
      return await client.vendors.status(request.input, callOptions);
    }
    case "vendors.update": {
      const client = await factory("vendors.update");
      return await client.vendors.update(request.input, callOptions);
    }
    case "packaging.package": {
      const client = await factory("packaging.package");
      return await client.packaging.package(request.input, callOptions);
    }
    case "providers.test": {
      const client = await factory("providers.test");
      return await client.providers.test(request.input, callOptions);
    }
    case "providers.sync": {
      const client = await factory("providers.sync");
      return await client.providers.sync(request.input, callOptions);
    }
    case "providers.status": {
      const client = await factory("providers.status");
      return await client.providers.status(request.input, callOptions);
    }
    case "governance.currentMainRecord": {
      const client = await factory("governance.currentMainRecord");
      return await client.governance.currentMainRecord(request.input, callOptions);
    }
    case "governance.currentMainSelection": {
      const client = await factory("governance.currentMainSelection");
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
    return record.classification === "Converged" || record.classification === "Changed" ? 0 : 1;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function assertNever(value: never): never {
  throw new Error(`Unreachable lifecycle operation: ${String(value)}`);
}
