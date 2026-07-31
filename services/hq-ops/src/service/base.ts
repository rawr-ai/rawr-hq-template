import { os } from "@orpc/server";
import type { AnalyticsClient, Logger } from "@rawr/hq-sdk";
import type { HqOpsResources } from "./model/ports/resources";

type Deps = {
  analytics: AnalyticsClient;
  logger: Logger;
  resources: HqOpsResources;
};

type Scope = { repoRoot: string };
type Config = Record<never, never>;
type Invocation = { traceId: string };
/** Complete host and invocation context admitted at the service boundary. */
export type Context = {
  readonly deps: Deps;
  readonly scope: Scope;
  readonly config: Config;
  readonly invocation: Invocation;
  readonly provided: Record<never, never>;
};

/** Native middleware author rooted in the complete service context. */
export const base = os.$context<Context>();
