import { RawrCommand, type RawrBaseFlags } from "@rawr/core";

import type { ExternalExtensionOperation, ExternalExtensionOperationResult } from "./model";
import { resolveExternalExtensionRuntime } from "./runtime";
import type { ExternalExtensionCommandRuntime } from "./service";

export abstract class ExternalExtensionCommand extends RawrCommand {
  protected externalExtensions(): ExternalExtensionCommandRuntime {
    return resolveExternalExtensionRuntime(this.config);
  }

  protected async refuseDryRunMutation(
    operation: ExternalExtensionOperation,
    flags: RawrBaseFlags
  ): Promise<boolean> {
    if (!flags.dryRun) return false;
    const state = await this.externalExtensions().list();
    this.outputOperation(
      {
        operation,
        disposition: "reject",
        reason: "--dry-run is not a supported external extension mutation mode",
        before: state,
        after: state,
      },
      flags
    );
    return true;
  }

  protected outputOperation(result: ExternalExtensionOperationResult, flags: RawrBaseFlags): void {
    const failedCleanups =
      result.cleanup?.filter((settlement) => settlement.status === "failed") ?? [];
    const failed =
      result.disposition === "reject" ||
      result.nativeStatus === "failed" ||
      result.reason !== undefined ||
      failedCleanups.length > 0;
    const failureReason =
      result.reason ??
      (failedCleanups.length > 0
        ? `cleanup failed for ${failedCleanups.map((settlement) => settlement.owner).join(", ")}`
        : `${result.operation} ${result.disposition}`);
    const output = failed
      ? this.fail(failureReason, {
          code:
            result.disposition === "reject"
              ? "EXTERNAL_EXTENSION_OPERATION_REJECTED"
              : "EXTERNAL_EXTENSION_OPERATION_FAILED",
          details: result,
        })
      : this.ok(result);
    this.outputResult(output, {
      flags,
      human: () => {
        this.log(`${result.operation}: ${result.disposition}`);
        if (result.reason) this.log(result.reason);
        for (const settlement of result.cleanup ?? []) {
          this.log(
            `cleanup ${settlement.owner}: ${settlement.status}${settlement.error ? ` (${settlement.error})` : ""}`
          );
        }
      },
    });
    if (failed) this.exit(1);
  }
}
