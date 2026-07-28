import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  ReleaseRelativePathSchema,
  RepositoryIdentitySchema,
} from "#agent-plugin-lifecycle-service/model/dto/release-identity";
import { router } from "#agent-plugin-lifecycle-service/router";

export { type Contract, contract } from "#agent-plugin-lifecycle-service/contract";

/** Public release-input byte and curated-member bounds admitted before dispatch. */
export {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
} from "#agent-plugin-lifecycle-service/model/dto/release-input";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied boundary required to construct one local lifecycle client. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/** Constructs the sole public local client over the private lifecycle router. */
export function createClient({ deps, scope, config }: CreateClientOptions) {
  return createRouterClient(router, {
    context: ({ invocation }: { invocation: Invocation }) =>
      ({
        deps,
        scope,
        config,
        invocation: { ...invocation },
        provided: {},
      }) satisfies RouterInitialContext,
  });
}

/** Typed local caller surface derived from the lifecycle service router. */
export type Client = ReturnType<typeof createClient>;

/** Admits one caller-supplied content authority before service dispatch. */
export const parseContentAuthority = inputParser(ContentAuthoritySchema);

/** Admits one caller-supplied exact Git commit object identity. */
export const parseGitCommitId = inputParser(GitCommitIdSchema);

/** Admits one caller-supplied exact Git tree object identity. */
export const parseGitTreeId = inputParser(GitTreeIdSchema);

/** Admits one caller-supplied curated plugin identity. */
export const parsePluginId = inputParser(PluginIdSchema);

/** Admits one caller-supplied service-relative content path. */
export const parseReleaseRelativePath = inputParser(ReleaseRelativePathSchema);

/** Admits one caller-supplied logical repository identity. */
export const parseRepositoryIdentity = inputParser(RepositoryIdentitySchema);

function inputParser<T extends TSchema>(schema: T): (value: unknown) => Static<T> | undefined {
  return (value) => (Value.Check(schema, value) ? value : undefined);
}
