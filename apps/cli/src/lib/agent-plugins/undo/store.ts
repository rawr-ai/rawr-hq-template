import type { CapsuleFailure, CapsuleStateDigest } from "./contract";
import type { CapsuleStateEnvelopeV1 } from "./state";

export interface CapsuleStateObservationV1 {
  readonly state: CapsuleStateEnvelopeV1;
  readonly bytes: Uint8Array;
}

export type CapsuleStoreReadResultV1 =
  | Readonly<{ kind: "Observed"; observation: CapsuleStateObservationV1 }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export type CapsuleStoreCasResultV1 =
  | Readonly<{ kind: "Committed"; observation: CapsuleStateObservationV1 }>
  | Readonly<{ kind: "Conflict"; observation: CapsuleStateObservationV1 }>
  | Readonly<{
    kind: "Unsettled";
    intendedState: CapsuleStateEnvelopeV1;
    observation?: CapsuleStateObservationV1;
    failure: CapsuleFailure;
  }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export interface CapsuleStateAccessV1 {
  read(): Promise<CapsuleStoreReadResultV1>;
  compareAndSet(input: Readonly<{
    expectedStateDigest: CapsuleStateDigest;
    nextState: CapsuleStateEnvelopeV1;
  }>): Promise<CapsuleStoreCasResultV1>;
}

export interface CapsuleExclusiveSessionV1 {
  readonly access: CapsuleStateAccessV1;
  release(): Promise<void>;
}

export type CapsuleStoreExclusiveResultV1 =
  | Readonly<{ kind: "Acquired"; session: CapsuleExclusiveSessionV1 }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export interface CapsuleStateStoreV1 extends CapsuleStateAccessV1 {
  acquireExclusiveSession(): Promise<CapsuleStoreExclusiveResultV1>;
}
