import type { AnalyticsClient, Logger } from "@habitat-ai/rawr-hq-sdk";
import { os } from "@orpc/server";
import type { SessionIndexRuntime } from "./common/ports/session-index-runtime";
import type { SessionSourceRuntime } from "./common/ports/session-source-runtime";

type Deps = {
  analytics: AnalyticsClient;
  logger: Logger;
  sessionIndexRuntime: SessionIndexRuntime;
  sessionSourceRuntime: SessionSourceRuntime;
};

type Scope = { workspaceRef: string };
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
