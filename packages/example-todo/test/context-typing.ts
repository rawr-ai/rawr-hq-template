import { implement } from "@orpc/server";
import { Type } from "typebox";

import { createClient } from "../src";
import type { DbPool } from "../src/orpc/ports/db";
import { createBaseProvider } from "../src/orpc/base-foundation";
import { sqlProvider } from "../src/orpc/middleware/sql-provider";
import {
  defineService,
  schema,
  type ServiceOf,
  type ServiceTypesOf,
  type Sql,
} from "../src/orpc-sdk";
import type { CreateClientOptions } from "../src/client";
import { contract } from "../src/service/contract";
import { createServiceMiddleware, createServiceProvider } from "../src/service/base";

declare const dbPool: DbPool;
declare const deps: CreateClientOptions["deps"];
declare const sql: Sql;

type DerivedTypingDeclaration = {
  initialContext: {
    deps: {
      dbPool: DbPool;
    };
    scope: {
      workspaceId: string;
    };
    config: CreateClientOptions["config"];
  };
  invocationContext: {
    traceId: string;
  };
  metadata: {
    audit?: "basic" | "full";
  };
};

type DerivedTypingService = ServiceTypesOf<DerivedTypingDeclaration>;

const derivedService = defineService<DerivedTypingDeclaration>({
  metadataDefaults: {
    idempotent: true,
    audit: "basic",
  },
  baseline: {
    policy: { events: {} },
  },
});

type DerivedTypingServiceFromDefinition = ServiceOf<typeof derivedService>;

const derivedTypingDeps: DerivedTypingService["Deps"] = deps;
void derivedTypingDeps;

const derivedTypingDepsFromDefinition: DerivedTypingServiceFromDefinition["Deps"] = deps;
void derivedTypingDepsFromDefinition;

const derivedTypingMetadata: DerivedTypingService["Metadata"] = {
  idempotent: true,
  audit: "basic",
};
void derivedTypingMetadata;

const derivedTypingContext: DerivedTypingService["Context"] = {
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
  invocation: {
    traceId: "trace-typing",
  },
  provided: {},
};
void derivedTypingContext;

// @ts-expect-error initialContext must include deps, scope, and config lanes.
defineService<{
  initialContext: {
    deps: {};
    scope: {};
  };
  invocationContext: {};
  metadata: {};
}>({
  metadataDefaults: {
    idempotent: true,
  },
  baseline: {
    policy: { events: {} },
  },
});

defineService<{
  initialContext: {
    deps: CreateClientOptions["deps"];
    scope: { workspaceId: string };
    config: CreateClientOptions["config"];
  };
  invocationContext: { traceId: string };
  metadata: {};
}>({
  metadataDefaults: {
    idempotent: true,
  },
  baseline: {
    policy: { events: {} },
    // @ts-expect-error telemetry config no longer belongs in defineService baseline.
    observability: {},
  },
});

defineService<{
  initialContext: {
    deps: CreateClientOptions["deps"];
    scope: { workspaceId: string };
    config: CreateClientOptions["config"];
  };
  invocationContext: { traceId: string };
  metadata: {};
}>({
  metadataDefaults: {
    idempotent: true,
  },
  baseline: {
    policy: { events: {} },
    // @ts-expect-error telemetry config no longer belongs in defineService baseline.
    analytics: {},
  },
});

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

const alternateInvocationService = defineService<{
  initialContext: {
    deps: CreateClientOptions["deps"];
    scope: { workspaceId: string };
    config: CreateClientOptions["config"];
  };
  invocationContext: { requestId: string };
  metadata: {};
}>({
  metadataDefaults: {
    idempotent: true,
  },
  baseline: {
    policy: { events: {} },
  },
});
void alternateInvocationService;

const localObservability = alternateInvocationService.createObservabilityMiddleware({
  spanAttributes({ context }) {
    return {
      workspace_id: context.scope.workspaceId,
      request_id: context.invocation.requestId,
    };
  },
  onError({ error }) {
    void error.code;
  },
});
void localObservability;

const localAnalytics = alternateInvocationService.createAnalyticsMiddleware({
  payload: ({ context, outcome }) => ({
    requestId: context.invocation.requestId,
    workspaceId: context.scope.workspaceId,
    outcome,
  }),
});
void localAnalytics;

alternateInvocationService.createRequiredObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    workspace_id: context.scope.workspaceId,
    request_id: context.invocation.requestId,
    has_logger: typeof context.deps.logger.info === "function",
  }),
});

alternateInvocationService.createRequiredAnalyticsMiddleware({
  payload: ({ context }) => ({
    requestId: context.invocation.requestId,
    has_analytics: typeof context.deps.analytics.track === "function",
  }),
});

alternateInvocationService.createRequiredObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    // @ts-expect-error required service middleware extensions must not depend on provided context.
    repo_id: context.provided.repo.id,
  }),
});

alternateInvocationService.createRequiredAnalyticsMiddleware({
  payload: ({ context }) => ({
    // @ts-expect-error required service middleware extensions must not depend on provided context.
    repoId: context.provided.repo.id,
  }),
});

alternateInvocationService.createObservabilityMiddleware({
  // @ts-expect-error additive observability middleware must not redefine the baseline log shell.
  logFields() {
    return {};
  },
});

alternateInvocationService.createObservabilityMiddleware({
  // @ts-expect-error additive observability hooks do not receive service baseline policy events.
  onError({ policyEvents }) {
    void policyEvents;
  },
});

alternateInvocationService.createAnalyticsMiddleware({
  // @ts-expect-error additive analytics middleware must not rename the baseline event stream.
  event: "alternate.procedure",
});

const additiveService = defineService<{
  initialContext: {
    deps: CreateClientOptions["deps"];
    scope: { workspaceId: string };
    config: CreateClientOptions["config"];
  };
  invocationContext: { traceId: string };
  metadata: {};
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "todo",
  },
  baseline: {
    policy: { events: {} },
  },
});

const additiveContract = {
  assign: additiveService.oc
    .input(schema(Type.Object({
      taskId: Type.String(),
      tagId: Type.String(),
    }, { additionalProperties: false })))
    .output(schema(Type.Object({
      ok: Type.Boolean(),
    }, { additionalProperties: false }))),
};

const additiveObservability = additiveService.createObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    workspace_id: context.scope.workspaceId,
  }),
});
const additiveAnalytics = additiveService.createAnalyticsMiddleware({
  payload: ({ context }) => ({
    workspaceId: context.scope.workspaceId,
  }),
});

const requiredExtensions = {
  observability: additiveService.createRequiredObservabilityMiddleware({}),
  analytics: additiveService.createRequiredAnalyticsMiddleware({}),
};

const additiveModuleBranch = additiveService.createImplementer(additiveContract, requiredExtensions)
  .use(additiveObservability)
  .use(additiveAnalytics);
void additiveModuleBranch;

// @ts-expect-error required service middleware extensions must be supplied at implementer creation.
additiveService.createImplementer(additiveContract);

const additiveProcedureBranch = additiveService.createImplementer(additiveContract, requiredExtensions).assign
  .use(additiveObservability)
  .use(additiveAnalytics);
void additiveProcedureBranch;

const invalidRequiredExtensions = {
  observability: additiveObservability,
  analytics: additiveAnalytics,
};

// @ts-expect-error required extension slots must reject additive middleware.
additiveService.createImplementer(additiveContract, invalidRequiredExtensions);

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

void dbPool;
void sql;
