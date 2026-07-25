import {
  MAX_NATIVE_PROVIDER_PLUGINS,
  NativeAgentProviderIdSchema,
} from "@rawr/resource-native-agent-provider";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import { CurrentMainSelectionLocatorSchema } from "../../../../model/dto/current-main-selection";
import { NativeProviderSessionTargetSchema } from "../../../../model/dto/provider-dependencies";
import {
  CanonicalAbsoluteLocatorSchema,
  ContentWorkspacePolicySchema,
} from "../../../../model/dto/releases/content-workspace";
import {
  BoundedReadonlyArray,
  EmptyReadonlyArray,
  NonEmptyReadonlyArray,
} from "../../../../model/dto/structural";
import {
  GitCommitIdSchema,
  GitTreeIdSchema,
  MAX_RELEASE_MEMBERS,
  PluginIdSchema,
  ReleaseInputDigestSchema,
  ReleaseSetDigestSchema,
  RepositoryIdentitySchema,
} from "../../../../shared/release";
import { hasStrictDescendantHomes } from "../policy/disposable-root";

const MAX_TARGETS = 16;
export const MAX_CONFIRMED_NATIVE_OPERATIONS =
  MAX_NATIVE_PROVIDER_PLUGINS + 3 * MAX_RELEASE_MEMBERS + 2;
const MAX_ISSUES = 256;
const MAX_FACTS = 4_096;
const MAX_DETAIL_LENGTH = 4_096;

export const ProviderIdSchema = NativeAgentProviderIdSchema;
export const ProviderHomeSchema = CanonicalAbsoluteLocatorSchema;
export const ProviderTargetSchema = NativeProviderSessionTargetSchema;
export const ProviderTestDisposableRootSchema = CanonicalAbsoluteLocatorSchema;

export const ProviderTargetsSchema = Refine(
  NonEmptyReadonlyArray(ProviderTargetSchema, { maxItems: MAX_TARGETS }),
  (targets) =>
    new Set(targets.map((target) => `${target.provider}\u0000${target.home}`)).size ===
    targets.length,
  () => "Provider targets must be distinct"
);

export const ProviderTestModeSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("targeted"),
      pluginIds: Refine(
        NonEmptyReadonlyArray(PluginIdSchema, { maxItems: MAX_RELEASE_MEMBERS }),
        (pluginIds) => new Set(pluginIds).size === pluginIds.length,
        () => "Targeted plugin identities must be distinct"
      ),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(Type.Object({ kind: Type.Literal("complete-set") }), {
    additionalProperties: false,
  }),
]);

export const ProviderTestRequestSchema = Refine(
  ReadonlyObject(
    Type.Object({
      contentWorkspace: ContentWorkspacePolicySchema,
      disposableRoot: ProviderTestDisposableRootSchema,
      mode: ProviderTestModeSchema,
      targets: ProviderTargetsSchema,
    }),
    { additionalProperties: false }
  ),
  ({ disposableRoot, targets }) => hasStrictDescendantHomes(disposableRoot, targets),
  () => "Every provider test home must be a strict descendant of the disposable root"
);

const channelRequestProperties = {
  channel: Type.Literal("current-main"),
  locator: CurrentMainSelectionLocatorSchema,
  targets: ProviderTargetsSchema,
} as const;

export const ProviderStatusRequestSchema = ReadonlyObject(Type.Object(channelRequestProperties), {
  additionalProperties: false,
});

export const ProviderSyncRequestSchema = ReadonlyObject(Type.Object(channelRequestProperties), {
  additionalProperties: false,
});

export const ProviderIssueCodeSchema = Type.Union([
  Type.Literal("SelectionRejected"),
  Type.Literal("SourceChanged"),
  Type.Literal("DesiredContentInvalid"),
  Type.Literal("TargetUnavailable"),
  Type.Literal("CapabilityMissing"),
  Type.Literal("MarketplaceCollision"),
  Type.Literal("PluginCollision"),
  Type.Literal("MarketplaceDrift"),
  Type.Literal("PluginMissing"),
  Type.Literal("PluginDisabled"),
  Type.Literal("OmittedPluginPresent"),
  Type.Literal("PluginFileMissing"),
  Type.Literal("PluginFileMismatch"),
  Type.Literal("NativeObservationFailed"),
  Type.Literal("NativeCommandFailed"),
  Type.Literal("VerificationFailed"),
  Type.Literal("NotAttempted"),
]);

export const ProviderIssueSchema = ReadonlyObject(
  Type.Object({
    code: ProviderIssueCodeSchema,
    detail: Type.String({ minLength: 1, maxLength: MAX_DETAIL_LENGTH }),
    pluginId: Type.Optional(PluginIdSchema),
  }),
  { additionalProperties: false }
);

const MarketplaceIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
});
const PluginSelectorSchema = Type.String({
  minLength: 3,
  maxLength: 256,
  pattern: "^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9_-]*$",
});

export const ConfirmedNativeOperationSchema = Type.Union([
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("marketplace-added"), identity: MarketplaceIdentitySchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("marketplace-removed"), identity: MarketplaceIdentitySchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("plugin-installed"), selector: PluginSelectorSchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("plugin-enabled"), selector: PluginSelectorSchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("plugin-removed"), selector: PluginSelectorSchema }),
    { additionalProperties: false }
  ),
]);

export const NativeOperationAttemptSchema = ReadonlyObject(
  Type.Object({
    operation: ConfirmedNativeOperationSchema,
    commandPhase: Type.Union([Type.Literal("started"), Type.Literal("command-returned")]),
  }),
  { additionalProperties: false }
);

export const VerificationFactSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Union([
      Type.Literal("marketplace-source"),
      Type.Literal("plugin-installed"),
      Type.Literal("plugin-enabled"),
      Type.Literal("plugin-file"),
      Type.Literal("plugin-absent"),
    ]),
    subject: Type.String({ minLength: 1, maxLength: 2_048 }),
    detail: Type.String({ minLength: 1, maxLength: MAX_DETAIL_LENGTH }),
  }),
  { additionalProperties: false }
);

const targetObservationProperties = {
  target: ProviderTargetSchema,
  facts: BoundedReadonlyArray(VerificationFactSchema, { maxItems: MAX_FACTS }),
  issues: BoundedReadonlyArray(ProviderIssueSchema, { maxItems: MAX_ISSUES }),
} as const;

const boundedNativeOperations = () =>
  BoundedReadonlyArray(ConfirmedNativeOperationSchema, {
    maxItems: MAX_CONFIRMED_NATIVE_OPERATIONS,
  });

const mutationTerminalResult = <const Classification extends string>(
  classification: Classification
) =>
  ReadonlyObject(
    Type.Object({
      ...targetObservationProperties,
      classification: Type.Literal(classification),
      operations: boundedNativeOperations(),
    }),
    { additionalProperties: false }
  );

export const ProviderMutationTargetResultSchema = Refine(
  Type.Union([
    mutationTerminalResult("Converged"),
    mutationTerminalResult("Changed"),
    mutationTerminalResult("Blocked"),
    mutationTerminalResult("Failed"),
    mutationTerminalResult("NotAttempted"),
    ReadonlyObject(
      Type.Object({
        ...targetObservationProperties,
        classification: Type.Literal("Uncertain"),
        operations: boundedNativeOperations(),
        attempted: NativeOperationAttemptSchema,
      }),
      { additionalProperties: false }
    ),
  ]),
  (result) =>
    result.classification === "Changed"
      ? result.operations.length > 0
      : result.classification === "Failed" || result.classification === "Uncertain"
        ? true
        : result.operations.length === 0,
  () => "Mutation classifications require a possible confirmed-operation history"
);

const statusTargetResultProperties = {
  ...targetObservationProperties,
  operations: EmptyReadonlyArray(ConfirmedNativeOperationSchema),
} as const;

const statusTerminalResult = <const Classification extends string>(
  classification: Classification
) =>
  ReadonlyObject(
    Type.Object({
      ...statusTargetResultProperties,
      classification: Type.Literal(classification),
    }),
    { additionalProperties: false }
  );

export const ProviderStatusTargetResultSchema = Type.Union([
  statusTerminalResult("Converged"),
  statusTerminalResult("Drifted"),
  statusTerminalResult("Blocked"),
  statusTerminalResult("Failed"),
]);

export const ProviderTargetResultSchema = Type.Union([
  ProviderStatusTargetResultSchema,
  ProviderMutationTargetResultSchema,
]);

export const SelectedContentObservationSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInputDigest: ReleaseInputDigestSchema,
    releaseSetDigest: Type.Union([ReleaseSetDigestSchema, Type.Null()]),
    pluginIds: Refine(
      NonEmptyReadonlyArray(PluginIdSchema, { maxItems: MAX_RELEASE_MEMBERS }),
      (pluginIds) =>
        new Set(pluginIds).size === pluginIds.length &&
        pluginIds.every((pluginId, index) => index === 0 || pluginIds[index - 1]! < pluginId),
      () => "Selected plugin identities must be distinct and canonically ordered"
    ),
  }),
  { additionalProperties: false }
);

const resultProperties = {
  selection: Type.Union([SelectedContentObservationSchema, Type.Null()]),
  issues: BoundedReadonlyArray(ProviderIssueSchema, { maxItems: MAX_ISSUES }),
} as const;

export const ProviderStatusResultSchema = ReadonlyObject(
  Type.Object({
    ...resultProperties,
    targets: BoundedReadonlyArray(ProviderStatusTargetResultSchema, { maxItems: MAX_TARGETS }),
    operation: Type.Literal("status"),
    classification: Type.Union([
      Type.Literal("Converged"),
      Type.Literal("Drifted"),
      Type.Literal("Blocked"),
      Type.Literal("Failed"),
    ]),
  }),
  { additionalProperties: false }
);

const mutationResultClassification = Type.Union([
  Type.Literal("Converged"),
  Type.Literal("Changed"),
  Type.Literal("Blocked"),
  Type.Literal("Failed"),
  Type.Literal("Partial"),
  Type.Literal("Uncertain"),
]);

export const ProviderSyncResultSchema = ReadonlyObject(
  Type.Object({
    ...resultProperties,
    targets: BoundedReadonlyArray(ProviderMutationTargetResultSchema, { maxItems: MAX_TARGETS }),
    operation: Type.Literal("sync"),
    classification: mutationResultClassification,
  }),
  { additionalProperties: false }
);

export const ProviderTestResultSchema = ReadonlyObject(
  Type.Object({
    ...resultProperties,
    targets: BoundedReadonlyArray(ProviderMutationTargetResultSchema, { maxItems: MAX_TARGETS }),
    operation: Type.Literal("test"),
    classification: mutationResultClassification,
  }),
  { additionalProperties: false }
);

export type ProviderId = Static<typeof ProviderIdSchema>;
export type ProviderTarget = Static<typeof ProviderTargetSchema>;
export type ProviderTestMode = Static<typeof ProviderTestModeSchema>;
export type ProviderTestRequest = Static<typeof ProviderTestRequestSchema>;
export type ProviderStatusRequest = Static<typeof ProviderStatusRequestSchema>;
export type ProviderSyncRequest = Static<typeof ProviderSyncRequestSchema>;
export type ProviderIssueCode = Static<typeof ProviderIssueCodeSchema>;
export type ProviderIssue = Static<typeof ProviderIssueSchema>;
export type ConfirmedNativeOperation = Static<typeof ConfirmedNativeOperationSchema>;
export type NativeOperationAttempt = Static<typeof NativeOperationAttemptSchema>;
export type VerificationFact = Static<typeof VerificationFactSchema>;
export type ProviderTargetResult = Static<typeof ProviderTargetResultSchema>;
export type ProviderMutationTargetResult = Static<typeof ProviderMutationTargetResultSchema>;
export type ProviderStatusTargetResult = Static<typeof ProviderStatusTargetResultSchema>;
export type SelectedContentObservation = Static<typeof SelectedContentObservationSchema>;
export type ProviderStatusResult = Static<typeof ProviderStatusResultSchema>;
export type ProviderSyncResult = Static<typeof ProviderSyncResultSchema>;
export type ProviderTestResult = Static<typeof ProviderTestResultSchema>;
