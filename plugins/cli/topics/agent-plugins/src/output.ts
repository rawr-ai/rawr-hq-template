import type { Contract } from "@habitat-ai/agent-plugin-lifecycle-service/client";
import type { Command } from "@oclif/core";
import type { InferRouterContractOutputs } from "@orpc/contract";

type Results = InferRouterContractOutputs<Contract>;
type ByOperation = {
  "releases.check": Results["releases"]["check"];
  "releases.checkRepository": Results["releases"]["checkRepository"];
  "releases.releaseInputRecord": Results["releases"]["releaseInputRecord"];
  "releases.refreshReleaseInput": Results["releases"]["refreshReleaseInput"];
  "governance.currentMainRecord": Results["governance"]["currentMainRecord"];
  "governance.currentMainSelection": Results["governance"]["currentMainSelection"];
  "packaging.package": Results["packaging"]["package"];
  "providers.status": Results["providers"]["status"];
  "providers.sync": Results["providers"]["sync"];
  "providers.test": Results["providers"]["test"];
  "vendors.update": Results["vendors"]["update"];
};

/** One service result and its command-local presentation choice, never an aggregate of calls. */
export type LifecycleOutcome = {
  [K in keyof ByOperation]: {
    readonly operation: K;
    readonly result: ByOperation[K];
    readonly json: boolean;
  };
}[keyof ByOperation];

/** Preserves the service's distinction between drift, invalid authority and successful mutation. */
export function exitCode(outcome: LifecycleOutcome): 0 | 1 | 2 {
  switch (outcome.operation) {
    case "releases.check":
      return outcome.result.kind === "EligibleReport" ? 0 : 1;
    case "releases.checkRepository":
      return outcome.result.kind === "StagedRepositoryEligible" ||
        outcome.result.kind === "CleanRepositoryEligible"
        ? 0
        : 1;
    case "releases.releaseInputRecord":
    case "governance.currentMainRecord":
      return outcome.result.ok ? 0 : 1;
    case "releases.refreshReleaseInput":
      return outcome.result.kind === "ReleaseInputCandidateReady" ||
        outcome.result.kind === "ReleaseInputReadOnlyConverged"
        ? 0
        : 1;
    case "governance.currentMainSelection":
      return outcome.result.kind === "CURRENT_ELIGIBLE" ? 0 : 2;
    case "packaging.package":
      return outcome.result.kind === "ReadOnlyConverged" ||
        outcome.result.kind === "OutputReplacedVerified"
        ? 0
        : 1;
    case "vendors.update":
      return outcome.result.kind === "ReadOnlyConverged" ||
        outcome.result.kind === "AuthoredReviewableChanges"
        ? 0
        : 1;
    case "providers.status":
      return outcome.result.classification === "Blocked" && outcome.result.selection === null
        ? 2
        : outcome.result.classification === "Converged"
          ? 0
          : 1;
    case "providers.sync":
    case "providers.test":
      return outcome.result.classification === "Blocked"
        ? 2
        : outcome.result.classification === "Converged" ||
            outcome.result.classification === "Changed"
          ? 0
          : 1;
  }
}

function bytes(value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array))
    throw new TypeError("Lifecycle returned a non-byte record carrier.");
  return value;
}

/** Formats only the CLI projection; successful human byte output is never reserialized. */
export function formatOutcome(outcome: LifecycleOutcome): string | Uint8Array {
  let recordBytes: Uint8Array | undefined;
  let result: unknown = outcome.result;
  switch (outcome.operation) {
    case "releases.releaseInputRecord":
    case "governance.currentMainRecord":
      if (outcome.result.ok) {
        const { bytes: carrier, ...value } = outcome.result.value;
        recordBytes = bytes(carrier);
        result = {
          ...outcome.result,
          value: {
            ...value,
            [outcome.operation === "releases.releaseInputRecord" ? "envelopeText" : "recordText"]:
              new TextDecoder("utf-8", { fatal: true }).decode(recordBytes),
          },
        };
      }
      break;
    case "releases.refreshReleaseInput":
      if (
        outcome.result.kind === "ReleaseInputCandidateReady" ||
        outcome.result.kind === "ReleaseInputReadOnlyConverged"
      ) {
        const { bytes: carrier, ...value } = outcome.result;
        recordBytes = bytes(carrier);
        result = {
          ...value,
          envelopeText: new TextDecoder("utf-8", { fatal: true }).decode(recordBytes),
        };
      }
      break;
  }
  if (!outcome.json && recordBytes !== undefined) return recordBytes;
  return `${JSON.stringify({ operation: outcome.operation, result }, null, outcome.json ? undefined : 2)}\n`;
}

/** Awaits native stdout completion before applying the result's process exit classification. */
export async function present(outcome: LifecycleOutcome, command: Command): Promise<void> {
  const output = formatOutcome(outcome);
  await new Promise<void>((resolve, reject) =>
    process.stdout.write(output, (error) => (error ? reject(error) : resolve()))
  );
  const code = exitCode(outcome);
  if (code !== 0) command.exit(code);
}
