import { randomUUID } from "node:crypto";

import type { Client } from "@habitat-ai/rawr-agent-plugin-lifecycle/client";
import {
  type LifecycleOperation,
  type LifecycleOperationClient,
  type LifecycleOperationOutcome,
  type LifecycleOperationSelector,
  type LifecycleResultByOperation,
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

/**
 * Closed operation/input union admitted by lifecycle command parsing.
 *
 * @remarks
 * The operation discriminant narrows the request passed to the matching
 * service-client procedure.
 */
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

type ProjectBytesAsText<TResult, TTextProperty extends string> =
  TResult extends Readonly<{
    bytes: Uint8Array;
  }>
    ? Readonly<Omit<TResult, "bytes"> & Readonly<Record<TTextProperty, string>>>
    : TResult;

type ProjectSuccessfulValueBytesAsText<TResult, TTextProperty extends string> =
  TResult extends Readonly<{
    ok: true;
    value: infer TValue extends Readonly<{ bytes: Uint8Array }>;
  }>
    ? Readonly<
        Omit<TResult, "value"> & {
          readonly value: ProjectBytesAsText<TValue, TTextProperty>;
        }
      >
    : TResult;

type LifecycleProjectedResultByOperation = Readonly<{
  [TOperation in LifecycleOperation]: TOperation extends "releases.releaseInputRecord"
    ? ProjectSuccessfulValueBytesAsText<LifecycleResultByOperation[TOperation], "envelopeText">
    : TOperation extends "releases.refreshReleaseInput"
      ? ProjectBytesAsText<LifecycleResultByOperation[TOperation], "envelopeText">
      : TOperation extends "governance.currentMainRecord"
        ? ProjectSuccessfulValueBytesAsText<LifecycleResultByOperation[TOperation], "recordText">
        : LifecycleResultByOperation[TOperation];
}>;

/**
 * Correlates an operation with its terminal-safe presentation result.
 *
 * @remarks
 * Binary record fields become UTF-8 text while the operation and service
 * result variants remain available for exhaustive human rendering.
 */
export type LifecycleProjectedOperationOutcome = {
  [TOperation in LifecycleOperation]: Readonly<{
    operation: TOperation;
    result: LifecycleProjectedResultByOperation[TOperation];
  }>;
}[LifecycleOperation];

type LifecycleCallOptions = NonNullable<Parameters<Client["releases"]["check"]>[1]>;

export {
  type LifecycleOperation,
  type LifecycleOperationClient,
  type LifecycleOperationOutcome,
  type LifecycleOperationSelector,
  type LifecycleResultByOperation,
} from "./binding";

/**
 * Invokes one admitted lifecycle operation and returns its correlated result.
 *
 * @remarks
 * Selection and procedure dispatch each occur once; the operation tag then
 * carries the service-owned result into classification and presentation.
 */
export async function invokeLifecycleProcedure(
  request: LifecycleOperationRequest,
  selectClient: LifecycleOperationSelector
): Promise<LifecycleOperationOutcome> {
  const callOptions = invocation(request.operation);
  switch (request.operation) {
    case "releases.check": {
      const client = selectClient("releases.check");
      return {
        operation: request.operation,
        result: await client.releases.check(request.input, callOptions),
      };
    }
    case "releases.checkRepository": {
      const client = selectClient("releases.checkRepository");
      return {
        operation: request.operation,
        result: await client.releases.checkRepository(request.input, callOptions),
      };
    }
    case "releases.releaseInputRecord": {
      const client = selectClient("releases.releaseInputRecord");
      return {
        operation: request.operation,
        result: await client.releases.releaseInputRecord(request.input, callOptions),
      };
    }
    case "releases.refreshReleaseInput": {
      const client = selectClient("releases.refreshReleaseInput");
      return {
        operation: request.operation,
        result: await client.releases.refreshReleaseInput(request.input, callOptions),
      };
    }
    case "vendors.status": {
      const client = selectClient("vendors.status");
      return {
        operation: request.operation,
        result: await client.vendors.status(request.input, callOptions),
      };
    }
    case "vendors.update": {
      const client = selectClient("vendors.update");
      return {
        operation: request.operation,
        result: await client.vendors.update(request.input, callOptions),
      };
    }
    case "packaging.package": {
      const client = selectClient("packaging.package");
      return {
        operation: request.operation,
        result: await client.packaging.package(request.input, callOptions),
      };
    }
    case "providers.test": {
      const client = selectClient("providers.test");
      return {
        operation: request.operation,
        result: await client.providers.test(request.input, callOptions),
      };
    }
    case "providers.sync": {
      const client = selectClient("providers.sync");
      return {
        operation: request.operation,
        result: await client.providers.sync(request.input, callOptions),
      };
    }
    case "providers.status": {
      const client = selectClient("providers.status");
      return {
        operation: request.operation,
        result: await client.providers.status(request.input, callOptions),
      };
    }
    case "governance.currentMainRecord": {
      const client = selectClient("governance.currentMainRecord");
      return {
        operation: request.operation,
        result: await client.governance.currentMainRecord(request.input, callOptions),
      };
    }
    case "governance.currentMainSelection": {
      const client = selectClient("governance.currentMainSelection");
      return {
        operation: request.operation,
        result: await client.governance.currentMainSelection(request.input, callOptions),
      };
    }
    default:
      return assertNever(request);
  }
}

/**
 * Classifies one typed lifecycle outcome as a CLI process exit code.
 *
 * @remarks
 * Exhaustive operation dispatch keeps each operation's service result narrowed
 * while preserving its existing success, failure, and blocked semantics.
 */
export function lifecycleResultExitCode(outcome: LifecycleOperationOutcome): 0 | 1 | 2 {
  switch (outcome.operation) {
    case "releases.check":
      return outcome.result.kind === "EligibleReport" ? 0 : 1;
    case "releases.checkRepository":
      return outcome.result.kind === "StagedRepositoryEligible" ||
        outcome.result.kind === "CleanRepositoryEligible"
        ? 0
        : 1;
    case "releases.releaseInputRecord":
      return outcome.result.ok ? 0 : 1;
    case "releases.refreshReleaseInput":
      return outcome.result.kind === "ReleaseInputCandidateReady" ||
        outcome.result.kind === "ReleaseInputReadOnlyConverged"
        ? 0
        : 1;
    case "vendors.status":
      return outcome.result.kind === "VendorStatus" ? 0 : 1;
    case "vendors.update":
      return outcome.result.kind === "ReadOnlyConverged" ||
        outcome.result.kind === "AuthoredReviewableChanges"
        ? 0
        : 1;
    case "packaging.package":
      return outcome.result.kind === "ReadOnlyConverged" ||
        outcome.result.kind === "OutputReplacedVerified"
        ? 0
        : 1;
    case "providers.test":
    case "providers.sync":
      if (outcome.result.classification === "Blocked") return 2;
      return outcome.result.classification === "Converged" ||
        outcome.result.classification === "Changed"
        ? 0
        : 1;
    case "providers.status":
      if (outcome.result.classification === "Blocked") return 2;
      return outcome.result.classification === "Converged" ? 0 : 1;
    case "governance.currentMainRecord":
      return outcome.result.ok ? 0 : 1;
    case "governance.currentMainSelection":
      return outcome.result.kind === "CURRENT_ELIGIBLE" ? 0 : 2;
    default:
      return assertNever(outcome);
  }
}

/**
 * Converts lifecycle byte payloads into their operator-facing UTF-8 text form.
 *
 * @remarks
 * Operations without byte presentation flow through unchanged, and the
 * operation/result correlation is preserved for JSON and human output.
 */
export function projectLifecycleResultForOutput(
  outcome: LifecycleOperationOutcome
): LifecycleProjectedOperationOutcome {
  switch (outcome.operation) {
    case "releases.releaseInputRecord": {
      if (!outcome.result.ok) {
        return { operation: outcome.operation, result: outcome.result };
      }
      const { bytes, ...value } = outcome.result.value;
      return Object.freeze({
        operation: outcome.operation,
        result: Object.freeze({
          ...outcome.result,
          value: Object.freeze({
            ...value,
            envelopeText: decodeLifecycleText(bytes),
          }),
        }),
      });
    }
    case "releases.refreshReleaseInput":
      switch (outcome.result.kind) {
        case "ReleaseInputCandidateReady":
        case "ReleaseInputReadOnlyConverged": {
          const { bytes, ...result } = outcome.result;
          return Object.freeze({
            operation: outcome.operation,
            result: Object.freeze({
              ...result,
              envelopeText: decodeLifecycleText(bytes),
            }),
          });
        }
        case "RepositoryIneligible":
        case "ReleaseInputRejected":
        case "SourceChanged":
          return { operation: outcome.operation, result: outcome.result };
        default:
          return assertNever(outcome.result);
      }
    case "governance.currentMainRecord": {
      if (!outcome.result.ok) {
        return { operation: outcome.operation, result: outcome.result };
      }
      const { bytes, ...value } = outcome.result.value;
      return Object.freeze({
        operation: outcome.operation,
        result: Object.freeze({
          ...outcome.result,
          value: Object.freeze({
            ...value,
            recordText: decodeLifecycleText(bytes),
          }),
        }),
      });
    }
    case "releases.check":
    case "releases.checkRepository":
    case "vendors.status":
    case "vendors.update":
    case "packaging.package":
    case "providers.test":
    case "providers.sync":
    case "providers.status":
    case "governance.currentMainSelection":
      return outcome;
    default:
      return assertNever(outcome);
  }
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

function decodeLifecycleText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function assertNever(value: never): never {
  throw new Error(`Unreachable lifecycle operation: ${String(value)}`);
}
