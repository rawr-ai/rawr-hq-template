import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import type { AgentPluginPayload } from "./agent-plugin-payload";
import type { AgentPluginRelease } from "./agent-plugin-release";
import type { AgentPluginReleaseSet } from "./agent-plugin-release-set";
import {
  type GitCommitId,
  type GitTreeId,
  type PluginId,
  PluginIdSchema,
  type RepositoryIdentity,
} from "./release-identity";
import { type AgentPluginReleaseInput, MAX_RELEASE_MEMBERS } from "./release-input";
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

/**
 * Carries the exact verified source facts needed to construct releases.
 *
 * @remarks
 * A complete content-workspace snapshot is structurally compatible, while
 * channel selection can supply the same facts without inventing eligibility
 * or object-binding state.
 */
export interface ReleaseDerivationSource {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[];
}

/**
 * Carries constructed release values from service policy to an owning
 * operation. Each module projects these inert values into its own public
 * result vocabulary.
 */
export interface DerivedReleaseSelection {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
}

/** Stable failure reasons emitted by shared release-derivation policy. */
export type ReleaseDerivationFailure =
  | Readonly<{ reason: "InvalidSelection"; detail: string }>
  | Readonly<{ reason: "UndeclaredMember"; pluginId: PluginId; detail: string }>
  | Readonly<{ reason: "MissingPayload"; pluginId: PluginId; detail: string }>
  | Readonly<{
      reason: "InvalidRelease";
      pluginId: PluginId;
      issueCodes: readonly string[];
      detail: string;
    }>
  | Readonly<{
      reason: "InvalidReleaseSet";
      issueCodes: readonly string[];
      detail: string;
    }>;

/** Constructed releases or one exact neutral derivation failure. */
export type ReleaseDerivationResult =
  | Readonly<{ ok: true; value: DerivedReleaseSelection }>
  | Readonly<{ ok: false; failure: ReleaseDerivationFailure }>;
