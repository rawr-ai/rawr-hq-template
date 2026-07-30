import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { type AgentPluginPayload, AgentPluginPayloadSchema } from "./agent-plugin-payload";
import { type AgentPluginRelease, AgentPluginReleaseSchema } from "./agent-plugin-release";
import {
  type AgentPluginReleaseSet,
  AgentPluginReleaseSetSchema,
} from "./agent-plugin-release-set";
import {
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "./release-identity";
import {
  type AgentPluginReleaseInput,
  AgentPluginReleaseInputSchema,
  MAX_RELEASE_MEMBERS,
} from "./release-input";
import { ReleaseIssueCodeSchema } from "./release-issue";
import { NonEmptyReadonlyArray } from "./structural";

/**
 * Defines whether a lifecycle operation derives one declared plugin release or
 * the complete verified release input. The service owns this choice because
 * both release eligibility and packaging consume it without sharing module
 * results.
 */
export const ReleaseSelectionSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("targeted"),
      pluginId: PluginIdSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("complete-set"),
    }),
    { additionalProperties: false }
  ),
]);

/** The TypeBox-derived release selection admitted by shared derivation policy. */
export type ReleaseSelection = Static<typeof ReleaseSelectionSchema>;

/**
 * Defines the bounded multi-member subset used internally by Provider
 * disposable tests without widening the public release or package modes.
 */
export const ReleaseSubsetSelectionSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("subset"),
    pluginIds: Refine(
      NonEmptyReadonlyArray(PluginIdSchema, { maxItems: MAX_RELEASE_MEMBERS }),
      (pluginIds) => new Set(pluginIds).size === pluginIds.length,
      () => "Release subset plugin identities must be distinct"
    ),
  }),
  { additionalProperties: false }
);

/**
 * Defines every service-internal selection accepted by release derivation.
 *
 * @remarks
 * Public release and package contracts continue to expose only
 * `ReleaseSelectionSchema`; the subset variant is an internal service handoff.
 */
export const ReleaseDerivationSelectionSchema = Type.Union([
  ReleaseSelectionSchema,
  ReleaseSubsetSelectionSchema,
]);

/** TypeBox-derived service-internal release derivation selection. */
export type ReleaseDerivationSelection = Static<typeof ReleaseDerivationSelectionSchema>;

const ReleaseDerivationPayloadSchema = ReadonlyObject(
  Type.Object({
    pluginId: PluginIdSchema,
    payload: AgentPluginPayloadSchema,
  }),
  { additionalProperties: false }
);

type ReleaseDerivationPayload = Static<typeof ReleaseDerivationPayloadSchema> &
  Readonly<{ payload: AgentPluginPayload }>;

/**
 * Defines the exact verified source facts needed to construct releases.
 *
 * @remarks
 * A complete content-workspace snapshot is structurally compatible, while
 * channel selection can supply the same facts without inventing eligibility
 * or object-binding state.
 */
export const ReleaseDerivationSourceSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInput: AgentPluginReleaseInputSchema,
    payloads: ReadonlyObject(Type.Array(ReleaseDerivationPayloadSchema), {
      maxItems: MAX_RELEASE_MEMBERS,
    }),
  }),
  { additionalProperties: false }
);

/** TypeBox-derived verified source facts consumed by release derivation policy. */
export type ReleaseDerivationSource = Static<typeof ReleaseDerivationSourceSchema> &
  Readonly<{
    releaseInput: AgentPluginReleaseInput;
    payloads: readonly ReleaseDerivationPayload[];
  }>;

/**
 * Defines constructed release values passed from service policy to an owning
 * operation. Each module projects these inert values into its own public
 * result vocabulary.
 */
export const DerivedReleaseSelectionSchema = ReadonlyObject(
  Type.Object({
    releases: ReadonlyObject(Type.Array(AgentPluginReleaseSchema), {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
    }),
    releaseSet: Type.Optional(AgentPluginReleaseSetSchema),
  }),
  { additionalProperties: false }
);

/** TypeBox-derived constructed release values returned by shared policy. */
export type DerivedReleaseSelection = Static<typeof DerivedReleaseSelectionSchema> &
  Readonly<{
    releases: readonly AgentPluginRelease[];
    releaseSet?: AgentPluginReleaseSet;
  }>;

const ReleaseDerivationDetailSchema = Type.String();
const ReleaseDerivationIssueCodesSchema = ReadonlyObject(Type.Array(ReleaseIssueCodeSchema));

/** Defines the stable failure reasons emitted by shared release-derivation policy. */
export const ReleaseDerivationFailureSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      reason: Type.Literal("InvalidSelection"),
      detail: ReleaseDerivationDetailSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      reason: Type.Literal("UndeclaredMember"),
      pluginId: PluginIdSchema,
      detail: ReleaseDerivationDetailSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      reason: Type.Literal("MissingPayload"),
      pluginId: PluginIdSchema,
      detail: ReleaseDerivationDetailSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      reason: Type.Literal("InvalidRelease"),
      pluginId: PluginIdSchema,
      issueCodes: ReleaseDerivationIssueCodesSchema,
      detail: ReleaseDerivationDetailSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      reason: Type.Literal("InvalidReleaseSet"),
      issueCodes: ReleaseDerivationIssueCodesSchema,
      detail: ReleaseDerivationDetailSchema,
    }),
    { additionalProperties: false }
  ),
]);

/** TypeBox-derived neutral failure returned by shared release-derivation policy. */
export type ReleaseDerivationFailure = Static<typeof ReleaseDerivationFailureSchema>;

/** Defines constructed releases or one exact neutral derivation failure. */
export const ReleaseDerivationResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(true),
      value: DerivedReleaseSelectionSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(false),
      failure: ReleaseDerivationFailureSchema,
    }),
    { additionalProperties: false }
  ),
]);

type ReleaseDerivationResultShape = Static<typeof ReleaseDerivationResultSchema>;

/** TypeBox-derived result returned by shared release-derivation policy. */
export type ReleaseDerivationResult =
  | (Extract<ReleaseDerivationResultShape, { readonly ok: true }> &
      Readonly<{ value: DerivedReleaseSelection }>)
  | Extract<ReleaseDerivationResultShape, { readonly ok: false }>;
