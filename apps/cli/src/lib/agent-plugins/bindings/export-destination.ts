import {
  createExportOwnerStateReader,
  executeExportInverseActionWithResource,
  type ExecuteExportInverseOptions,
  type ExportInverseReplayResult,
  type ExportLifecycleRuntime,
} from "@rawr/agent-plugin-lifecycle/ports/exports";
import { makeNodeExportDestinationPort } from "@rawr/resource-agent-plugin-export-destination/providers/effect-platform-node";

export const nodeExportDestinationRuntime = makeNodeExportDestinationPort();
export const nodeExportOwnerStateReader = createExportOwnerStateReader(nodeExportDestinationRuntime);

export function createExportLifecycleRuntime(
  dependencies: Omit<ExportLifecycleRuntime, "destinationRuntime">,
): ExportLifecycleRuntime {
  return Object.freeze({
    ...dependencies,
    destinationRuntime: nodeExportDestinationRuntime,
  });
}

export function executeExportInverseAction(
  actionInput: unknown,
  observationInput: unknown,
  options: ExecuteExportInverseOptions = {},
): Promise<ExportInverseReplayResult> {
  return executeExportInverseActionWithResource(
    actionInput,
    observationInput,
    nodeExportDestinationRuntime,
    options,
  );
}

export type { ExecuteExportInverseOptions, ExportInverseReplayResult };
