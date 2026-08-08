import {
  createRouterClient,
  type InferRouterInitialContext,
  type RouterClient,
} from "@orpc/server";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "./service/model/dto/release-identity";
import { parseReleaseRelativePath as admitReleaseRelativePath } from "./service/model/policy/release-identity";
import {
  parseCurrentMainRecordInput as admitCurrentMainRecordInput,
  type CurrentMainRecordPolicyInput,
  type CurrentMainRecordPolicyResult,
} from "./service/modules/governance/model/policy/current-main-record";
import type {
  ReleaseInputRecordPolicyInput,
  ReleaseInputRecordPolicyResult,
} from "./service/modules/releases/model/policy/release-input-record";
import type { ReleaseInputRefreshPolicyResult } from "./service/modules/releases/model/policy/release-input-refresh";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";

/** Public release-input byte and curated-member bounds admitted before dispatch. */
export {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
} from "./service/model/dto/release-input";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied boundary required to construct one local lifecycle client. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

type WireClient = RouterClient<typeof router, { invocation: Invocation }>;
type Procedure = (...args: never[]) => Promise<unknown>;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest]
  ? Rest
  : never;
type RuntimeProcedure<TProcedure extends Procedure, TInput, TOutput> = (
  input: TInput,
  ...options: Tail<Parameters<TProcedure>>
) => Promise<TOutput>;

type RuntimeReleasesClient = Omit<
  WireClient["releases"],
  "releaseInputRecord" | "refreshReleaseInput"
> &
  Readonly<{
    releaseInputRecord: RuntimeProcedure<
      WireClient["releases"]["releaseInputRecord"],
      ReleaseInputRecordPolicyInput,
      ReleaseInputRecordPolicyResult
    >;
    refreshReleaseInput: RuntimeProcedure<
      WireClient["releases"]["refreshReleaseInput"],
      Parameters<WireClient["releases"]["refreshReleaseInput"]>[0],
      ReleaseInputRefreshPolicyResult
    >;
  }>;

type RuntimeGovernanceClient = Omit<WireClient["governance"], "currentMainRecord"> &
  Readonly<{
    currentMainRecord: RuntimeProcedure<
      WireClient["governance"]["currentMainRecord"],
      CurrentMainRecordPolicyInput,
      CurrentMainRecordPolicyResult
    >;
  }>;

/** Typed in-process caller surface derived from wire procedures and policy-owned runtime values. */
export type Client = Omit<WireClient, "releases" | "governance"> &
  Readonly<{
    releases: RuntimeReleasesClient;
    governance: RuntimeGovernanceClient;
  }>;

/** Constructs the sole public local client over the private lifecycle router. */
export function createClient(options: CreateClientOptions): Client;
/** Implements local client construction through the service's native in-process router client. */
export function createClient({ deps, scope, config }: CreateClientOptions): Client | WireClient {
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

/** Admits one caller-supplied current-main record operation request. */
export const parseCurrentMainRecordInput = admitCurrentMainRecordInput;

/** Admits one caller-supplied content authority before service dispatch. */
export const parseContentAuthority = inputParser(ContentAuthoritySchema);

/** Admits one caller-supplied exact Git commit object identity. */
export const parseGitCommitId = inputParser(GitCommitIdSchema);

/** Admits one caller-supplied exact Git tree object identity. */
export const parseGitTreeId = inputParser(GitTreeIdSchema);

/** Admits one caller-supplied curated plugin identity. */
export const parsePluginId = inputParser(PluginIdSchema);

/** Admits one caller-supplied service-relative content path. */
export const parseReleaseRelativePath = (value: unknown) => {
  const result = admitReleaseRelativePath(value);
  return result.ok ? result.value : undefined;
};

/** Admits one caller-supplied logical repository identity. */
export const parseRepositoryIdentity = inputParser(RepositoryIdentitySchema);

function inputParser<T extends TSchema>(schema: T): (value: unknown) => Static<T> | undefined {
  return (value) => (Value.Check(schema, value) ? value : undefined);
}
