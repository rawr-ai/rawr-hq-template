import { ReadonlyObject, Type, type Static } from "typebox";

import { NonEmptyReadonlyArray } from "../../../../model/dto/structural";
import {
  ArtifactRefInputSchema,
  ArtifactRefSchema,
  MechanicalEvidenceHandleInputSchema,
  MechanicalEvidenceHandleSchema,
} from "../../../../shared/release";

export const MAX_RETENTION_REFS = 16_384;
export const MAX_RETENTION_ISSUE_DETAIL_LENGTH = 4_096;

export const RetentionRefInputSchema = Type.Union([
  ArtifactRefInputSchema,
  MechanicalEvidenceHandleInputSchema,
]);

export const RetentionRefSchema = Type.Union([
  ArtifactRefSchema,
  MechanicalEvidenceHandleSchema,
]);

export const RetentionIssueSchema = ReadonlyObject(Type.Object(
  {
    ref: Type.Optional(RetentionRefSchema),
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_RETENTION_ISSUE_DETAIL_LENGTH,
    }),
  },
), { additionalProperties: false });

export const RetentionPinsV1Schema = ReadonlyObject(Type.Object(
  {
    schemaVersion: Type.Literal(1),
    refs: ReadonlyObject(Type.Array(RetentionRefInputSchema), {
      maxItems: MAX_RETENTION_REFS,
    }),
  },
), { additionalProperties: false });

export const RetentionInventoryEntrySchema = ReadonlyObject(Type.Object(
  {
    ref: RetentionRefSchema,
    storedBytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  },
), { additionalProperties: false });

export const RetentionInventoryEntryInputSchema = ReadonlyObject(Type.Object(
  {
    ref: RetentionRefInputSchema,
    storedBytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  },
), { additionalProperties: false });

export const RetentionInventorySchema = ReadonlyObject(
  Type.Array(RetentionInventoryEntryInputSchema),
  { maxItems: MAX_RETENTION_REFS },
);

export const PlanRetentionInputSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("space-v1"),
    maximumUnpinnedBytes: Type.Integer({
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
  },
), { additionalProperties: false });

export const RetentionPlanSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("RetentionPlan"),
    pinned: ReadonlyObject(Type.Array(RetentionRefSchema), { maxItems: MAX_RETENTION_REFS }),
    retained: ReadonlyObject(Type.Array(RetentionInventoryEntrySchema), { maxItems: MAX_RETENTION_REFS }),
    collectible: ReadonlyObject(Type.Array(RetentionInventoryEntrySchema), { maxItems: MAX_RETENTION_REFS }),
    blockedEntries: ReadonlyObject(Type.Array(RetentionIssueSchema), { maxItems: MAX_RETENTION_REFS }),
  },
), { additionalProperties: false });

export const RetentionPlanBlockedSchema = ReadonlyObject(Type.Object(
  {
    kind: Type.Literal("RetentionPlanBlocked"),
    issues: NonEmptyReadonlyArray(RetentionIssueSchema, {
      maxItems: MAX_RETENTION_REFS,
    }),
  },
), { additionalProperties: false });

export const PlanRetentionResultSchema = Type.Union([
  RetentionPlanSchema,
  RetentionPlanBlockedSchema,
]);

export type RetentionRef = Static<typeof RetentionRefSchema>;
export type RetentionIssue = Static<typeof RetentionIssueSchema>;
export type RetentionPinsV1 = Static<typeof RetentionPinsV1Schema>;
export type RetentionInventoryEntry = Static<typeof RetentionInventoryEntrySchema>;
export type RetentionSpacePolicyV1 = Static<typeof PlanRetentionInputSchema>;
export type RetentionPlan = Static<typeof RetentionPlanSchema>;
export type RetentionPlanBlocked = Static<typeof RetentionPlanBlockedSchema>;
export type RetentionResult = Static<typeof PlanRetentionResultSchema>;
