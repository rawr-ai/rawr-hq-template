export const CAPSULE_PROTOCOL_VERSION = 1 as const;
export const MAX_CAPSULE_ACTIONS = 4_096;
export const MAX_CAPSULE_RELATIVE_PATHS = 16_384;
export const MAX_CAPSULE_DECODED_PRIOR_BYTES = 64 * 1024 * 1024;
export const MAX_CAPSULE_STATE_BYTES = 96 * 1024 * 1024;

export type CapsuleStateDigest = `cs1_${string}`;
export type CapsuleDigest = `cc1_${string}`;
export type CapsuleGeneration = `cg1_${string}`;
export type CapsuleToken = string & { readonly __capsuleToken: "CapsuleTokenV1" };
export type CapsuleActionDigest = `ca1_${string}`;
export type CapsuleActionHandle = CapsuleActionDigest;

export interface TargetStateBindingV1 {
  readonly canonicalTarget: string;
  readonly authorityGeneration: string;
  readonly authorityDigest: string;
}

export interface OwnerActionInspectionV1 {
  readonly actionType: string;
  readonly relativePaths: readonly string[];
  readonly decodedPriorBytes: number;
  /** Maximum canonical JSON byte length, including LF, of the post-mutation observation. */
  readonly maximumObservedPostBytes: number;
}

export type OwnerActionSequenceModeV1 = "complete" | "applied-prefix";

export interface OwnerProtocolCodecV1<Action = unknown, ObservedPost = unknown> {
  readonly owner: string;
  readonly protocolVersion: number;
  parseAction(value: unknown): Action;
  encodeAction(action: Action): unknown;
  inspectAction(action: Action): OwnerActionInspectionV1;
  parseObservedPost(action: Action, value: unknown): ObservedPost;
  encodeObservedPost(action: Action, observedPost: ObservedPost): unknown;
  validateActionSequence(input: Readonly<{
    actions: readonly Action[];
    mode: OwnerActionSequenceModeV1;
  }>): void;
  selectTargetBindings(input: Readonly<{
    bindings: readonly TargetStateBindingV1[];
    actions: readonly Action[];
  }>): readonly TargetStateBindingV1[];
}

export type OwnerReplayClassificationV1<ObservedPost = unknown> =
  | Readonly<{ kind: "ExpectedPost"; observedPost: ObservedPost }>
  | Readonly<{ kind: "AlreadyRestored" }>
  | Readonly<{ kind: "Prior" }>
  | Readonly<{ kind: "Ambiguous"; failure: CapsuleFailure }>;

export type OwnerReplayMutationResultV1 =
  | Readonly<{ kind: "Restored" }>
  | Readonly<{ kind: "AlreadyRestored" }>
  | Readonly<{ kind: "Blocked"; failure: CapsuleFailure }>
  | Readonly<{ kind: "Failed"; failure: CapsuleFailure }>;

export interface OwnerReplayExecutorV1<Action = unknown, ObservedPost = unknown> {
  readonly owner: string;
  readonly protocolVersion: number;
  classify(input: Readonly<{
    action: Action;
    observedPost: ObservedPost;
    targets: readonly TargetStateBindingV1[];
  }>): Promise<OwnerReplayClassificationV1<ObservedPost>>;
  restore(input: Readonly<{
    action: Action;
    observedPost: ObservedPost;
    targets: readonly TargetStateBindingV1[];
  }>): Promise<OwnerReplayMutationResultV1>;
  verifyPrior(input: Readonly<{
    actions: readonly Readonly<{ action: Action; observedPost: ObservedPost }>[];
    targets: readonly TargetStateBindingV1[];
  }>): Promise<Readonly<{ kind: "Verified" }> | Readonly<{ kind: "Blocked"; failure: CapsuleFailure }>>;
}

export interface OwnerApplyingRecoveryV1<Action = unknown, ObservedPost = unknown> {
  readonly owner: string;
  readonly protocolVersion: number;
  classifyStaged(input: Readonly<{
    action: Action;
    targets: readonly TargetStateBindingV1[];
  }>): Promise<
    | Readonly<{ kind: "NotApplied" }>
    | Readonly<{ kind: "Applied"; observedPost: ObservedPost }>
    | Readonly<{ kind: "Ambiguous"; failure: CapsuleFailure }>
  >;
}

export interface OwnerProtocolRegistrationV1<Action = unknown, ObservedPost = unknown> {
  readonly codec: OwnerProtocolCodecV1<Action, ObservedPost>;
  readonly applyingRecovery: OwnerApplyingRecoveryV1<Action, ObservedPost>;
  readonly replay: OwnerReplayExecutorV1<Action, ObservedPost>;
}

export type PlannedOwnerActionV1 = Readonly<{
  action: unknown;
}>;

export interface CapsuleBeginInputV1 {
  readonly owner: string;
  readonly ownerProtocolVersion: number;
  readonly contentAuthority: string;
  readonly targets: readonly TargetStateBindingV1[];
  readonly actions: readonly PlannedOwnerActionV1[];
}

export type CapsulePreflightResult =
  | Readonly<{ kind: "Accepted" }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export type CapsuleBeginResult =
  | Readonly<{
    kind: "Accepted";
    generation: CapsuleGeneration;
    admittedActions: readonly Readonly<{ actionHandle: CapsuleActionHandle }>[];
    session: CapsuleApplyingSessionV1;
  }>
  | Readonly<{
    kind: "Unsettled";
    generation: CapsuleGeneration;
    failure: CapsuleFailure;
    recoveryRequired: true;
    synchronization: CapsuleReleaseResultV1;
  }>
  | Readonly<{
    kind: "Rejected";
    failure: CapsuleFailure;
    synchronization: CapsuleSynchronizationResultV1;
  }>;

export type CapsuleWriteResult =
  | Readonly<{ kind: "Accepted"; generation: CapsuleGeneration }>
  | Readonly<{
    kind: "Unsettled";
    generation: CapsuleGeneration;
    failure: CapsuleFailure;
    recoveryRequired: true;
    synchronization: CapsuleReleaseResultV1;
  }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export type CapsuleSuspendResult =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "Rejected"; failure: CapsuleFailure }>;

export type CapsuleReleaseResultV1 =
  | Readonly<{ kind: "Released" }>
  | Readonly<{ kind: "ReleaseFailed"; failure: CapsuleFailure }>;

export type CapsuleSynchronizationResultV1 =
  | CapsuleReleaseResultV1
  | Readonly<{ kind: "NotAcquired" }>;

export type CapsuleTerminalWriteResult = CapsuleWriteResult & Readonly<{
  synchronization: CapsuleReleaseResultV1;
}>;

export interface CapsuleApplyingSessionV1 {
  stage(input: Readonly<{
    actionHandle: CapsuleActionHandle;
  }>): Promise<CapsuleWriteResult>;
  discardStaged(input: Readonly<{
    actionHandle: CapsuleActionHandle;
  }>): Promise<CapsuleWriteResult>;
  markApplied(input: Readonly<{
    actionHandle: CapsuleActionHandle;
    observedPost: unknown;
  }>): Promise<CapsuleWriteResult>;
  suspend(): Promise<CapsuleSuspendResult>;
  settle(): Promise<CapsuleTerminalWriteResult>;
  abort(): Promise<CapsuleTerminalWriteResult>;
}

export interface CapsuleUndoWriterV1 {
  preflight(input: CapsuleBeginInputV1): Promise<CapsulePreflightResult>;
  begin(input: CapsuleBeginInputV1): Promise<CapsuleBeginResult>;
}

export type ReplayActionOutcomeV1 =
  | Readonly<{ kind: "Pending" }>
  | Readonly<{ kind: "Restored" }>
  | Readonly<{ kind: "AlreadyRestored" }>
  | Readonly<{ kind: "Blocked"; failure: CapsuleFailure }>
  | Readonly<{ kind: "Failed"; failure: CapsuleFailure }>;

type UnsynchronizedUndoResult =
  | Readonly<{ kind: "NoCommittedCapsule" }>
  | Readonly<{ kind: "RejectedBeforeReplay"; failure: CapsuleFailure }>
  | Readonly<{ kind: "RestoredAndCleared" }>
  | Readonly<{
    kind: "ReplayUnsettled";
    generation: CapsuleGeneration;
    outcomes: readonly ReplayActionOutcomeV1[];
    failure: CapsuleFailure;
  }>;

export type UndoResult = UnsynchronizedUndoResult & Readonly<{
  synchronization: CapsuleSynchronizationResultV1;
}>;

type UnsynchronizedApplyingRecoveryResult =
  | Readonly<{ kind: "RecoveryRejected"; failure: CapsuleFailure }>
  | Readonly<{ kind: "NoApplyingState" }>
  | Readonly<{ kind: "RecoveredToPriorIdle" }>
  | Readonly<{ kind: "RecoveredCommitted"; generation: CapsuleGeneration }>
  | Readonly<{
    kind: "ApplyingUnsettled";
    generation: CapsuleGeneration;
    failure: CapsuleFailure;
  }>;

export type ApplyingRecoveryResult = UnsynchronizedApplyingRecoveryResult & Readonly<{
  synchronization: CapsuleSynchronizationResultV1;
}>;

export const CAPSULE_FAILURE_CODES = Object.freeze([
  "InvalidInput",
  "UnknownOwnerProtocol",
  "InvalidOwnerAction",
  "InvalidObservedPost",
  "ActionDigestMismatch",
  "CapsuleBoundExceeded",
  "StateInvalid",
  "StateChanged",
  "StateBlocked",
  "StaleToken",
  "ActionStateConflict",
  "AppliedObservationMissing",
  "ReplayBlocked",
  "ReplayFailed",
  "RootUnsafe",
  "AdmissionUnsafe",
  "AdmissionBusy",
  "AdmissionUnsupported",
  "StatePublicationFailed",
  "TemporaryCleanupBlocked",
  "TemporaryCleanupFailed",
] as const);

export type CapsuleFailureCode = (typeof CAPSULE_FAILURE_CODES)[number];

export interface CapsuleFailure {
  readonly code: CapsuleFailureCode;
  readonly phase: string;
  readonly message: string;
  readonly path?: string;
  readonly cleanup?: Readonly<{
    code: "TemporaryCleanupBlocked" | "TemporaryCleanupFailed";
    message: string;
    path: string;
  }>;
}
