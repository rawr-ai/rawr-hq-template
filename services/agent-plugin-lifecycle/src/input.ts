import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  ReleaseRelativePathSchema,
  RepositoryIdentitySchema,
} from "./service/model/dto/releases/content-workspace";
import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES as releaseInputEnvelopeByteLimit,
  MAX_RELEASE_MEMBERS as releaseMemberLimit,
} from "./service/shared/release/primitives";

/**
 * Public CLI parsing facade.
 *
 * Raw command values flow through service-owned TypeBox schemas into typed
 * operation requests. Release construction, serialization, and digesting stay
 * private to the lifecycle service.
 */

/** Maximum release-input envelope size admitted before operation dispatch. */
export const MAX_RELEASE_INPUT_ENVELOPE_BYTES = releaseInputEnvelopeByteLimit;

/** Maximum curated-member count admitted before operation dispatch. */
export const MAX_RELEASE_MEMBERS = releaseMemberLimit;

/** Validates one raw CLI content-authority value against the service contract. */
export const parseContentAuthority = inputParser(ContentAuthoritySchema);

/** Validates one exact Git commit object ID supplied through the CLI. */
export const parseGitCommitId = inputParser(GitCommitIdSchema);

/** Validates one exact Git tree object ID supplied through the CLI. */
export const parseGitTreeId = inputParser(GitTreeIdSchema);

/** Validates one curated plugin identity supplied through the CLI. */
export const parsePluginId = inputParser(PluginIdSchema);

/** Validates one service-relative content path supplied through the CLI. */
export const parseReleaseRelativePath = inputParser(ReleaseRelativePathSchema);

/** Validates one logical repository identity supplied through the CLI. */
export const parseRepositoryIdentity = inputParser(RepositoryIdentitySchema);

function inputParser<T extends TSchema>(schema: T): (value: unknown) => Static<T> | undefined {
  return (value) => (Value.Check(schema, value) ? value : undefined);
}
