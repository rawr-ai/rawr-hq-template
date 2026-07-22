import type {
  ArtifactRef,
  MechanicalEvidenceHandleV1,
} from "../../../../shared/release";

export interface RetentionIssue {
  readonly ref?: RetentionRef;
  readonly detail: string;
}

export type RetentionRef = ArtifactRef | MechanicalEvidenceHandleV1;

export interface RetentionPinsV1 {
  readonly schemaVersion: 1;
  readonly refs: readonly RetentionRef[];
}

export interface RetentionInventoryEntry {
  readonly ref: RetentionRef;
  readonly storedBytes: number;
}

export interface RetentionSpacePolicyV1 {
  readonly kind: "space-v1";
  readonly maximumUnpinnedBytes: number;
}

export interface RetentionPlan {
  readonly kind: "RetentionPlan";
  readonly pinned: readonly RetentionRef[];
  readonly retained: readonly RetentionInventoryEntry[];
  readonly collectible: readonly RetentionInventoryEntry[];
  readonly blockedEntries: readonly RetentionIssue[];
}

export interface RetentionPlanBlocked {
  readonly kind: "RetentionPlanBlocked";
  readonly issues: readonly [RetentionIssue, ...RetentionIssue[]];
}

export type RetentionResult = RetentionPlan | RetentionPlanBlocked;
