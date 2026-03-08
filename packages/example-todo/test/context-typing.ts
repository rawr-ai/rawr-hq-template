import { implement } from "@orpc/server";

import { createClient } from "../src";
import type { BaseMetadata } from "../src/orpc/base";
import type { DbPool } from "../src/orpc/adapters/sql";
import {
  defineService,
  type BaseObservabilityProfile,
  type BasePolicyProfile,
  type Sql,
} from "../src/orpc-sdk";
import { createBaseProvider } from "../src/orpc/base-foundation";
import type { CreateClientOptions } from "../src/client";
import { sqlProvider } from "../src/orpc/middleware/sql-provider";
import { contract } from "../src/service/contract";
import { createServiceMiddleware, createServiceProvider } from "../src/service/base";

function createTestBase<TMeta extends BaseMetadata, TContext extends {
  deps: CreateClientOptions["deps"];
}>() {
  const observability: BaseObservabilityProfile<TMeta, TContext> = {
    loggerEvent: "test.procedure",
    startedEvent: "test.procedure.started",
    succeededEvent: "test.procedure.succeeded",
    failedEvent: "test.procedure.failed",
    getAttributes() {
      return {};
    },
    getLogFields() {
      return {};
    },
  };
  const policy: BasePolicyProfile = { events: {} };

  return {
    analytics: { app: "alternate" },
    observability,
    policy,
  };
}

declare const dbPool: DbPool;
declare const deps: CreateClientOptions["deps"];
declare const sql: Sql;

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

const alternateInvocationService = defineService<BaseMetadata, {
  deps: CreateClientOptions["deps"];
  scope: { workspaceId: string };
  config: CreateClientOptions["config"];
  invocation: { requestId: string };
  provided: {};
}>({
  metadata: {
    idempotent: true,
  },
  base: createTestBase<BaseMetadata, {
    deps: CreateClientOptions["deps"];
    scope: { workspaceId: string };
    config: CreateClientOptions["config"];
    invocation: { requestId: string };
    provided: {};
  }>(),
});
void alternateInvocationService;

const baseProvider = createBaseProvider().middleware<{
  sql: Sql;
}>(async ({ next }) => {
  return next({
    sql,
  });
});
void baseProvider;

const serviceProvider = createServiceProvider().middleware<{
  repo: {
    find(): null;
  };
}>(async ({ next }) => {
  return next({
    repo: {
      find() {
        return null;
      },
    },
  });
});
void serviceProvider;

createServiceMiddleware().middleware(async ({ next }) => {
  // @ts-expect-error normal middleware must not add execution context.
  return next({
    repo: {
      find() {
        return null;
      },
    },
  });
});

createBaseProvider().middleware<{
  deps: {};
}>(async ({ next }) => {
  // @ts-expect-error shared providers must not write reserved lane names.
  return next({
    deps: {},
  });
});

createServiceProvider().middleware<{
  scope: {
    workspaceId: string;
  };
}>(async ({ next }) => {
  // @ts-expect-error service-local providers must not write reserved lane names.
  return next({
    scope: {
      workspaceId: "workspace-typing",
    },
  });
});

createServiceProvider().middleware<{
  provided: {};
}>(async ({ next }) => {
  // @ts-expect-error service-local providers must not write to the shared bucket.
  return next({
    provided: {},
  });
});

createServiceProvider<{
  provided: {
    repo: {
      find(): null;
    };
  };
}>().middleware<{
  repo: {
    save(): null;
  };
}>(async ({ next }) => {
  // @ts-expect-error providers must not overwrite an existing provided key.
  return next({
    repo: {
      save() {
        return null;
      },
    },
  });
});

// @ts-expect-error invocation context is required at the callsite.
typedClient.tasks.get({ id: "00000000-0000-0000-0000-000000000001" });

typedClient.tasks.get(
  { id: "00000000-0000-0000-0000-000000000001" },
  { context: { invocation: { traceId: "trace-123" } } },
);
void dbPool;
void sql;
