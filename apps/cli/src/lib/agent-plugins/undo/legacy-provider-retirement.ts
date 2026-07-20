import { randomBytes } from "node:crypto";

import type { CapsuleRoot } from "../layout";
import { LifecycleAuthorityBindingError } from "../commands/binding";
import type { CapsuleAdvisoryLockV1 } from "./advisory-lock";
import {
  openExistingRawCapsuleSlotV1,
  type CapsuleStoreFailpointsV1,
} from "./node-store";
import { createAgentPluginOwnerProtocolRegistryV1 } from "./export-owner-protocol";
import { parseCapsuleStateBytes, sealCapsuleState } from "./state";
import { requireGeneration } from "./validation";
import { decodeLegacyProviderIdleCapsuleV1 } from "./legacy-provider-idle";

export type ExportOnlyCapsulePreparationV1 =
  | Readonly<{ kind: "Absent" }>
  | Readonly<{ kind: "Ready" }>
  | Readonly<{ kind: "LegacyProviderNonReplayable" }>;

/**
 * Retires the one shipped provider-owned idle capsule only when an export is
 * about to claim the shared slot. Qualified undo can classify but never mutate it.
 */
export async function prepareExportOnlyCapsuleSlotV1(input: Readonly<{
  capsuleRoot: CapsuleRoot;
  mode: "export-activation" | "qualified-undo";
}>, options: Readonly<{
  advisoryLock?: CapsuleAdvisoryLockV1;
  failpoints?: CapsuleStoreFailpointsV1;
  openExistingRawSlot?: typeof openExistingRawCapsuleSlotV1;
}> = {}): Promise<ExportOnlyCapsulePreparationV1> {
  const registry = createAgentPluginOwnerProtocolRegistryV1();
  const openExistingRawSlot = options.openExistingRawSlot ?? openExistingRawCapsuleSlotV1;
  const opened = await openExistingRawSlot({
    root: input.capsuleRoot,
    registry,
    ...(options.advisoryLock === undefined ? {} : { advisoryLock: options.advisoryLock }),
    ...(options.failpoints === undefined ? {} : { failpoints: options.failpoints }),
  });
  if (opened.kind === "Absent") return Object.freeze({ kind: "Absent" });
  if (opened.kind === "Rejected") {
    throw new LifecycleAuthorityBindingError(opened.failure.message);
  }

  let result: ExportOnlyCapsulePreparationV1 | undefined;
  let operationError: unknown;
  try {
    const observed = await opened.session.read();
    if (observed.kind === "Rejected") throw new Error(observed.failure.message);
    const bytes = observed.observation.bytes;
    try {
      parseCapsuleStateBytes(bytes, registry);
      result = Object.freeze({ kind: "Ready" });
    } catch (exportDecodeError) {
      try {
        decodeLegacyProviderIdleCapsuleV1(bytes);
      } catch (legacyDecodeError) {
        throw new Error(
          `capsule is neither export-owned nor an exact idle provider-v1 capsule: ${errorMessage(exportDecodeError)}; ${errorMessage(legacyDecodeError)}`,
        );
      }
      if (input.mode === "qualified-undo") {
        result = Object.freeze({ kind: "LegacyProviderNonReplayable" });
      } else {
        const nextState = sealCapsuleState(
          requireGeneration(`cg1_${randomBytes(32).toString("hex")}`),
          Object.freeze({ kind: "idle", committed: null }),
        );
        const retired = await opened.session.compareAndSet({
          expectedBytes: bytes,
          nextState,
        });
        if (retired.kind !== "Committed") {
          throw new Error(
            retired.kind === "Unsettled"
              ? `legacy provider capsule retirement is unsettled: ${retired.failure.message}`
              : `legacy provider capsule retirement was rejected: ${retired.failure.message}`,
          );
        }
        result = Object.freeze({ kind: "Ready" });
      }
    }
  } catch (error) {
    operationError = error;
  }

  try {
    await opened.session.release();
  } catch (error) {
    throw new LifecycleAuthorityBindingError(
      `Capsule admission release failed after export-only activation: ${errorMessage(error)}`,
    );
  }
  if (operationError !== undefined) {
    throw new LifecycleAuthorityBindingError(errorMessage(operationError));
  }
  if (result === undefined) {
    throw new LifecycleAuthorityBindingError("Export-only capsule activation produced no classification");
  }
  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
