import {
  type ExportDestinationRuntime,
  type ExportLifecycleRuntime,
  type ExportOwnerStateReader,
} from "@rawr/agent-plugin-lifecycle/ports/exports";

import {
  captureDestination,
  captureDirectFile,
  captureExistingDirectory,
  capturePath,
} from "./node-filesystem";
import { buildDestinationExportPlan } from "./node-plan";
import { executeDestinationPlan } from "./node-transaction";

export const nodeExportDestinationRuntime: ExportDestinationRuntime = Object.freeze({
  captureDestination,
  buildDestinationExportPlan,
  executeDestinationPlan,
});

export const nodeExportOwnerStateReader: ExportOwnerStateReader = Object.freeze({
  captureDestination,
  captureDirectFile,
  captureExistingDirectory,
  capturePath,
});

export function createExportLifecycleRuntime(
  dependencies: Omit<ExportLifecycleRuntime, "destinationRuntime">,
): ExportLifecycleRuntime {
  return Object.freeze({
    ...dependencies,
    destinationRuntime: nodeExportDestinationRuntime,
  });
}

export {
  executeExportInverseAction,
  type ExecuteExportInverseOptions,
  type ExportInverseReplayResult,
} from "./node-inverse-executor";
