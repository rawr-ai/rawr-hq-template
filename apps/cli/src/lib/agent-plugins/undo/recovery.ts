import type { ApplyingRecoveryResult, CapsuleFailure } from "./contract";

export function applyingRecoveryBlockingFailure(
  result: ApplyingRecoveryResult,
): CapsuleFailure | null {
  if (result.synchronization.kind === "ReleaseFailed") {
    return result.synchronization.failure;
  }
  if (result.kind === "RecoveryRejected" || result.kind === "ApplyingUnsettled") {
    return result.failure;
  }
  return null;
}
