import { implement } from "@orpc/server";

import { createClient } from "../src";
import type { DbPool } from "../src/orpc/adapters/sql";
import type { CreateClientOptions } from "../src/client";
import { sqlProvider } from "../src/orpc/middleware/sql-provider";
import { contract } from "../src/service/contract";

declare const dbPool: DbPool;
declare const deps: CreateClientOptions["deps"];

// Missing nested dependency fragment should fail at `.use(...)`.
const missingSqlDeps = implement(contract).$context<{
  deps: {};
  scope: { workspaceId: string };
  config: { readOnly: boolean; limits: { maxAssignmentsPerTask: number } };
  invocation: { traceId: string };
}>()
  // @ts-expect-error dbPool is required by the SQL provider.
  .use(sqlProvider);
void missingSqlDeps;

// Exact match should pass.
const exactSqlDeps = implement(contract)
  .$context<{
    deps: { dbPool: DbPool };
    scope: { workspaceId: string };
    config: { readOnly: boolean; limits: { maxAssignmentsPerTask: number } };
    invocation: { traceId: string };
  }>()
  .use(sqlProvider);
void exactSqlDeps;

// Structural superset should also pass.
const extendedSqlDeps = implement(contract)
  .$context<{
    deps: { dbPool: DbPool; featureFlag: boolean };
    scope: { workspaceId: string; tenantId?: string };
    config: { readOnly: boolean; limits: { maxAssignmentsPerTask: number }; previewMode?: boolean };
    invocation: { traceId: string; spanId?: string };
  }>()
  .use(sqlProvider);
void extendedSqlDeps;

const validBoundary: CreateClientOptions = {
  deps,
  scope: {
    workspaceId: "workspace-typing",
  },
  config: {
    readOnly: false,
    limits: {
      maxAssignmentsPerTask: 2,
    },
  },
};
void validBoundary;

// Old top-level request-scoped fields should fail at the package boundary.
const invalidBoundary: CreateClientOptions = {
  deps,
  scope: {
    workspaceId: "workspace-typing",
  },
  config: {
    readOnly: false,
    limits: {
      maxAssignmentsPerTask: 2,
    },
  },
  // @ts-expect-error requestId no longer belongs at top level.
  requestId: "req-42",
};
void invalidBoundary;

const typedClient = createClient(validBoundary);
void typedClient;

// @ts-expect-error invocation context is required at the callsite.
typedClient.tasks.get({ id: "00000000-0000-0000-0000-000000000001" });

typedClient.tasks.get(
  { id: "00000000-0000-0000-0000-000000000001" },
  { context: { invocation: { traceId: "trace-123" } } },
);
void dbPool;
