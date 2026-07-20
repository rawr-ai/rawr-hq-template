import { resolveControllerReentry } from "@rawr/core";

import { LifecycleAuthorityBindingError } from "../commands/binding";
import { deriveAgentPluginControllerLayout } from "../layout";
import {
  applyingRecoveryBlockingFailure,
  CapsuleControllerWriterV1,
  CapsuleUndoControllerV1,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
  type UndoResult,
} from "../undo";
import { prepareExportOnlyCapsuleSlotV1 } from "../undo/legacy-provider-retirement";

export async function createProductionAgentPluginUndo(): Promise<UndoResult> {
  return undoAgentPluginCapsuleAtDataRoot(controllerDataRoot());
}

export async function undoAgentPluginCapsuleAtDataRoot(
  dataRoot: string,
): Promise<UndoResult> {
  const layout = deriveAgentPluginControllerLayout({ dataRoot });
  const preparation = await prepareExportOnlyCapsuleSlotV1({
    capsuleRoot: layout.capsuleRoot,
    mode: "qualified-undo",
  });
  if (preparation.kind === "Absent") {
    return Object.freeze({
      kind: "NoCommittedCapsule",
      synchronization: Object.freeze({ kind: "NotAcquired" }),
    });
  }
  if (preparation.kind === "LegacyProviderNonReplayable") {
    return Object.freeze({
      kind: "RejectedBeforeReplay",
      failure: Object.freeze({
        code: "UnknownOwnerProtocol",
        phase: "undo-owner",
        message: "Retired provider lifecycle capsules are non-replayable",
      }),
      synchronization: Object.freeze({ kind: "Released" }),
    });
  }

  const registry = createAgentPluginOwnerProtocolRegistryV1();
  const opened = await openNodeCapsuleStateStoreV1({ root: layout.capsuleRoot, registry });
  if (opened.kind === "Rejected") throw new LifecycleAuthorityBindingError(opened.failure.message);
  const observed = await opened.store.read();
  if (observed.kind === "Rejected") throw new LifecycleAuthorityBindingError(observed.failure.message);
  if (observed.observation.state.body.state.kind === "applying") {
    const recovery = await new CapsuleControllerWriterV1({ store: opened.store, registry })
      .recoverApplying({ expectedStateDigest: observed.observation.state.stateDigest });
    const recoveryFailure = applyingRecoveryBlockingFailure(recovery);
    if (recoveryFailure !== null) {
      return Object.freeze({
        kind: "RejectedBeforeReplay",
        failure: recoveryFailure,
        synchronization: recovery.synchronization,
      });
    }
  }
  return new CapsuleUndoControllerV1({ store: opened.store, registry }).undo();
}

function controllerDataRoot(): string {
  const dataRoot = resolveControllerReentry().env.RAWR_DATA_DIR;
  if (dataRoot === undefined) {
    throw new LifecycleAuthorityBindingError("Verified controller data identity is unavailable");
  }
  return dataRoot;
}
