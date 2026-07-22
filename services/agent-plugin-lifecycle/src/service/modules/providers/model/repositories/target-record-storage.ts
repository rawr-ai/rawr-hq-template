import type { ProviderTargetDigest } from "../dto/provider-target";
import type { DeploymentResult } from "../errors/deployment-result";

declare const targetRecordCaptureHandleBrand: unique symbol;
declare const targetRecordReadTokenBrand: unique symbol;
declare const targetRecordPlanDigestBrand: unique symbol;

export type TargetRecordCaptureHandle = string & {
  readonly [targetRecordCaptureHandleBrand]: "TargetRecordCaptureHandle";
};

export type TargetRecordReadToken = string & {
  readonly [targetRecordReadTokenBrand]: "TargetRecordReadToken";
};

export type TargetRecordPlanDigest = string & {
  readonly [targetRecordPlanDigestBrand]: "TargetRecordPlanDigest";
};

export type TargetRecordKind = "identity" | "receipt";

export interface TargetRecordKey {
  readonly kind: TargetRecordKind;
  readonly targetDigest: ProviderTargetDigest;
}

export type TargetRecordObservation =
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "present"; bytes: Uint8Array }>;

export interface TargetRecordCapture {
  readonly captureHandle: TargetRecordCaptureHandle;
  readonly readToken: TargetRecordReadToken;
  readonly key: TargetRecordKey;
  readonly observation: TargetRecordObservation;
}

export type TargetRecordMutation =
  | Readonly<{ kind: "put"; bytes: Uint8Array }>
  | Readonly<{ kind: "remove" }>;

export interface TargetRecordWriteObservation {
  readonly kind: "applied" | "read-only-converged";
}

export interface TargetRecordRestoreObservation {
  readonly kind: "restored";
  readonly changed: boolean;
}

export interface TargetRecordPlanInput {
  readonly capture: TargetRecordCapture;
  readonly planDigest: TargetRecordPlanDigest;
}

/**
 * Mechanical target-record storage keyed only by lifecycle semantic identity.
 *
 * A failed write or settlement leaves its capture available for exact restore.
 * Only an unmutated capture may be released; a written or restored capture must
 * be settled. Failed release hands unmutated authority to retainUnreleased;
 * incomplete restore/settlement hands a plan to retainUnsettled. Both handoffs
 * are total, process-local, and perform no durable/controller write. Storage
 * locations, provider-home paths, and controller state do not cross this port.
 */
export interface PathlessTargetRecordCollection {
  read(key: TargetRecordKey): Promise<DeploymentResult<TargetRecordObservation>>;
  capture(key: TargetRecordKey): Promise<DeploymentResult<TargetRecordCapture>>;
  release(capture: TargetRecordCapture): Promise<DeploymentResult<null>>;
  write(
    input: TargetRecordPlanInput &
      Readonly<{
        mutation: TargetRecordMutation;
      }>
  ): Promise<DeploymentResult<TargetRecordWriteObservation>>;
  restore(input: TargetRecordPlanInput): Promise<DeploymentResult<TargetRecordRestoreObservation>>;
  settle(input: TargetRecordPlanInput): Promise<DeploymentResult<null>>;
  retainUnreleased(capture: TargetRecordCapture): void;
  retainUnsettled(input: TargetRecordPlanInput): void;
}
