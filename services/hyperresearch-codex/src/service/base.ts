import { os } from "@orpc/server";
import type { AnalyticsClient, Logger } from "@rawr/hq-sdk";
import type { HyperresearchCliBackend, HyperresearchCodexIO } from "./common/resources";

type Deps = {
  analytics: AnalyticsClient;
  cli: HyperresearchCliBackend;
  io: HyperresearchCodexIO;
  logger: Logger;
};

type Scope = { repoRoot: string };
type Config = Record<never, never>;
type Invocation = { traceId: string };
/** Complete host and invocation context admitted at the service boundary. */
export type Context = {
  deps: Deps;
  scope: Scope;
  config: Config;
  invocation: Invocation;
  provided: Record<never, never>;
};

/** Native middleware author rooted in the complete service context. */
export const base = os.$context<Context>();
