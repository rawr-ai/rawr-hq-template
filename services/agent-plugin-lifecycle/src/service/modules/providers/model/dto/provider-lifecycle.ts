import {
  MAX_NATIVE_PROVIDER_PLUGINS,
  NativeAgentProviderIdSchema,
} from "@habitat-ai/resource-native-agent-provider";
import { ReadonlyObject, type Static, Type } from "typebox";
import { ContentWorkspacePolicySchema } from "../../../../model/dto/content-workspace";
import { CurrentMainSelectionLocatorSchema } from "../../../../model/dto/current-main-selection";
import {
  ReleaseInputDigestSchema,
  ReleaseSetDigestSchema,
} from "../../../../model/dto/release-digest";
import {
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "../../../../model/dto/release-identity";
import { MAX_RELEASE_MEMBERS } from "../../../../model/dto/release-input";
import { BoundedReadonlyArray, EmptyReadonlyArray } from "../../../../model/dto/structural";

const MAX_TARGETS = 16;
export const MAX_CONFIRMED_NATIVE_OPERATIONS =
  MAX_NATIVE_PROVIDER_PLUGINS + 3 * MAX_RELEASE_MEMBERS + 2;
/** Maximum public verification facts returned for one Provider target. */
export const MAX_PROVIDER_FACTS = 4_096;
/** Maximum public issues returned by one Provider operation or target. */
export const MAX_PROVIDER_ISSUES = 256;
const MAX_DETAIL_LENGTH = 4_096;

export const ProviderIdSchema = NativeAgentProviderIdSchema;
/** Publishes the structural wire shape of an explicit native-provider home. */
export const ProviderHomeSchema = Type.String({
  minLength: 2,
  maxLength: 16_384,
  pattern: "^/(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/](?:.*[^/])?$",
  description:
    "Projectable non-root absolute path structure; native-provider policy owns canonical admission.",
});
export const ProviderTargetSchema = ReadonlyObject(
  Type.Object({
    provider: NativeAgentProviderIdSchema,
    home: ProviderHomeSchema,
  }),
  { additionalProperties: false }
);
/**
 * Defines the caller-owned filesystem boundary for one live provider test.
 * Sequential calls may reuse the root to verify convergence, while concurrent
 * calls require distinct roots so each native provider reads one stable source.
 */
export const ProviderTestDisposableRootSchema = Type.String({
  minLength: 2,
  maxLength: 16_384,
  pattern: "^/(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/](?:.*[^/])?$",
  description:
    "Projectable non-root absolute path exclusively owned by one live provider-test call; sequential calls may reuse it.",
});

export const ProviderTargetsSchema = ReadonlyObject(Type.Array(ProviderTargetSchema), {
  minItems: 1,
  maxItems: MAX_TARGETS,
  uniqueItems: true,
});

export const ProviderTestModeSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("targeted"),
      pluginIds: ReadonlyObject(Type.Array(PluginIdSchema), {
        minItems: 1,
        maxItems: MAX_RELEASE_MEMBERS,
        uniqueItems: true,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(Type.Object({ kind: Type.Literal("complete-set") }), {
    additionalProperties: false,
  }),
]);

export const ProviderTestRequestSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: ContentWorkspacePolicySchema,
    disposableRoot: ProviderTestDisposableRootSchema,
    mode: ProviderTestModeSchema,
    targets: ProviderTargetsSchema,
  }),
  { additionalProperties: false }
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
  facts: BoundedReadonlyArray(VerificationFactSchema, { maxItems: MAX_PROVIDER_FACTS }),
  issues: BoundedReadonlyArray(ProviderIssueSchema, { maxItems: MAX_PROVIDER_ISSUES }),
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

export const ProviderMutationTargetResultSchema = Type.Union([
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
]);

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
    pluginIds: ReadonlyObject(Type.Array(PluginIdSchema), {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
      uniqueItems: true,
    }),
  }),
  { additionalProperties: false }
);

const resultProperties = {
  selection: Type.Union([SelectedContentObservationSchema, Type.Null()]),
  issues: BoundedReadonlyArray(ProviderIssueSchema, { maxItems: MAX_PROVIDER_ISSUES }),
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
