import { ReadonlyObject, type Static, Type } from "typebox";
import { PluginIdSchema } from "../../shared/release/primitives";
import type { AgentPluginRelease } from "../../shared/release/release";
import type { AgentPluginReleaseSet } from "../../shared/release/release-set";

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
 * Carries constructed release artifacts from service policy to an owning
 * operation. Each module projects these inert artifacts into its own public
 * result vocabulary.
 */
export interface DerivedReleaseSelection {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
}
