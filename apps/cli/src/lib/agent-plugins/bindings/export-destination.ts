import {
  createExportOwnerStateReader,
  executeExportInverseActionWithResource,
  type ExecuteExportInverseOptions,
  type ExportInverseReplayResult,
  type ExportLifecycleHostRuntime,
} from "@rawr/agent-plugin-lifecycle/bindings/exports";
import { makeNodeExportDestinationPort } from "@rawr/resource-agent-plugin-export-destination/providers/effect-platform-node";

export const nodeExportDestinationRuntime = makeNodeExportDestinationPort();
export const nodeExportOwnerStateReader = createExportOwnerStateReader(nodeExportDestinationRuntime);

export function createExportLifecycleRuntime(
  dependencies: Omit<ExportLifecycleHostRuntime, "destinationRuntime">,
): ExportLifecycleHostRuntime {
  return Object.freeze({
    knownNativeHomesReader: dependencies.knownNativeHomesReader,
    undoWriter: dependencies.undoWriter,
    destinationRuntime: nodeExportDestinationRuntime,
    ...(dependencies.failpoints === undefined ? {} : { failpoints: dependencies.failpoints }),
    ...(dependencies.operationId === undefined ? {} : { operationId: dependencies.operationId }),
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
