import type { AnalyticsClient, DbPool, Logger } from "@habitat-ai/rawr-hq-sdk";
import { os } from "@orpc/server";
import type { WorkspaceIdType } from "./model/dto/workspace-id";
import type { Clock } from "./model/ports/clock";
import type { IdentifierGenerator } from "./model/ports/identifier-generator";

type Deps = {
  analytics: AnalyticsClient;
  clock: Clock;
  dbPool: DbPool;
  identifierGenerator: IdentifierGenerator;
  logger: Logger;
};

type Scope = { workspaceId: WorkspaceIdType };
type Config = {
  readOnly: boolean;
  limits: { maxAssignmentsPerTask: number };
};
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
