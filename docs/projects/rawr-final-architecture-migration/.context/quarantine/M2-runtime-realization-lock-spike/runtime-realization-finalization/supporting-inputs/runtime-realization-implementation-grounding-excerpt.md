# Runtime Realization Implementation Grounding Excerpt

Status: Quarantined implementation reference
Scope: Example todo service internals only

## Authority

This excerpt is not target authority. It exists only to keep examples concrete where the runtime realization specification needs realistic service-internal grounding.

This excerpt must not become the document spine, a dedicated section focus, or the default lens for runtime realization. It is a reference for example realism only.

This excerpt does not establish the target service boundary schema API. Where runtime-carried boundary lanes are specified, the synthesis lock governs `RuntimeSchema` usage.

This excerpt does not establish canonical service package topology. Use its file tree, helper names, module names, repository-provider split, middleware names, and example-todo paths only to calibrate realistic service-owned examples.

Use this excerpt for:

- N > 1 service module organization;
- schema-backed service contracts;
- contract, module composition, router, repository-provider separation;
- root service router composition.

Do not use this excerpt for:

- target package names;
- target import paths;
- target SDK package names;
- target runtime topology;
- plugin registration API names;
- plugin internals or API projection internals;
- app/runtime entrypoint shape;
- runtime realization ownership decisions.

Where this excerpt conflicts with the Runtime Realization Synthesis Lock, the lock wins. The synthesized specification must not mention this excerpt or describe it as evidence.

## Actual File Set

These are the only implementation files represented by this excerpt:

```text
services/example-todo/src/
  index.ts
  client.ts
  router.ts
  service/
    base.ts
    contract.ts
    impl.ts
    router.ts
    middleware/
      analytics.ts
      observability.ts
      read-only-mode.ts
    modules/
      tasks/
        schemas.ts
        contract.ts
        module.ts
        middleware.ts
        repository.ts
        router.ts
      tags/
        schemas.ts
        contract.ts
        module.ts
        middleware.ts
        repository.ts
        router.ts
      assignments/
        schemas.ts
        contract.ts
        module.ts
        middleware.ts
        repository.ts
        router.ts
    shared/
      errors.ts
      internal-errors.ts

```

The codebase uses non-authoritative import paths and helper names in these files. The snippets below omit imports where import paths would create target-authority confusion.

## Service Boundary Shape

File: `services/example-todo/src/service/base.ts`
Layer: service authoring, service truth

```ts
export interface Clock {
  now(): string;
}

type InitialContext = {
  deps: {
    dbPool: DbPool;
    clock: Clock;
  };
  scope: {
    workspaceId: string;
  };
  config: {
    readOnly: boolean;
    limits: {
      maxAssignmentsPerTask: number;
    };
  };
};

type InvocationContext = {
  traceId: string;
};

type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
};

const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "todo",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;
export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceProvider = service.createProvider;
export const createServiceImplementer = service.createImplementer;
```

Grounding rule: service authoring separates stable dependency lanes (`deps`, `scope`, `config`), invocation context, metadata, service-local middleware builders, and implementation assembly. Target terminology must still come from the synthesis lock.

## Schema-Backed Entity Contract

File: `services/example-todo/src/service/modules/tasks/schemas.ts`
Layer: service module schema

```ts
export const TaskSchema = Type.Object(
  {
    id: Type.String({
      format: "uuid",
      description: "Stable unique identifier for the task.",
    }),
    workspaceId: Type.String({
      minLength: 1,
      description: "Workspace scope that owns this task record.",
    }),
    title: Type.String({
      minLength: 1,
      maxLength: 500,
      description: "Primary task title.",
    }),
    description: Type.Union(
      [
        Type.String({
          maxLength: 2000,
          description: "Optional detailed notes for the task.",
        }),
        Type.Null({
          description: "No description is set for this task.",
        }),
      ],
      { description: "Optional task description value." },
    ),
    completed: Type.Boolean({
      description: "Completion status of the task.",
    }),
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the task was created.",
    }),
    updatedAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the task was last updated.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical persisted task entity.",
  },
);

export type Task = Static<typeof TaskSchema>;
```

Grounding rule: service and plugin data boundaries use schemas or schema-backed contract objects. Plain string labels are not schema definitions.

## Module Procedure Contract

File: `services/example-todo/src/service/modules/tasks/contract.ts`
Layer: service module callable contract

```ts
export const contract = {
  create: ocBase
    .meta({ idempotent: false })
    .input(
      schema(
        Type.Object(
          {
            title: Type.String({
              minLength: 1,
              maxLength: 500,
              description: "Human-readable task title.",
            }),
            description: Type.Optional(
              Type.String({
                maxLength: 2000,
                description: "Optional longer details for the task.",
              }),
            ),
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a new task.",
          },
        ),
      ),
    )
    .output(schema(TaskSchema))
    .errors({
      READ_ONLY_MODE,
      INVALID_TASK_TITLE: {
        status: 400,
        message: "Invalid task title",
        data: schema(
          Type.Object(
            {
              title: Type.Optional(
                Type.String({
                  description: "Raw title value that failed validation or normalization.",
                }),
              ),
            },
            {
              additionalProperties: false,
              description: "Context describing why the task title was rejected.",
            },
          ),
        ),
      },
    }),

  get: ocBase
    .meta({ idempotent: true })
    .input(
      schema(
        Type.Object(
          {
            id: Type.String({
              format: "uuid",
              description: "Unique task identifier.",
            }),
          },
          {
            additionalProperties: false,
            description: "Input payload for fetching a task by id.",
          },
        ),
      ),
    )
    .output(schema(TaskSchema))
    .errors({ RESOURCE_NOT_FOUND }),
};
```

Grounding rule: module contracts own caller-visible shape. Module composition and handler behavior live elsewhere.

## Module Composition

File: `services/example-todo/src/service/modules/tasks/module.ts`
Layer: service module composition

```ts
export const module = impl.tasks
  .use(observability)
  .use(analytics)
  .use(repository)
  .use(async ({ context, next }) => next({
    context: {
      clock: context.deps.clock,
      logger: context.deps.logger,
      workspaceId: context.scope.workspaceId,
      repo: context.provided.repo,
    },
  }));
```

Grounding rule: module composition attaches middleware and maps stable context lanes into handler-local context. It does not redefine the module contract.

## Module Provider

File: `services/example-todo/src/service/modules/tasks/middleware.ts`
Layer: service module provider

```ts
export const repository = createServiceProvider<{
  scope: {
    workspaceId: string;
  };
  provided: {
    sql: Sql;
  };
}>().middleware<{
  repo: ReturnType<typeof createRepository>;
}>(async ({ context, next }) => {
  return next({
    repo: createRepository(context.provided.sql, context.scope.workspaceId),
  });
});
```

Grounding rule: service-local providers write into `context.provided.*`. The runtime realization spec must still distinguish service-local provider mechanics from runtime resource/provider acquisition.

## Module Router

File: `services/example-todo/src/service/modules/tasks/router.ts`
Layer: service module handler implementation

```ts
const create = module.create.handler(async ({ context, input, errors }) => {
  const title = input.title.trim();
  if (title.length === 0) {
    throw errors.INVALID_TASK_TITLE({
      message: "Task title cannot be blank",
      data: { title: input.title },
    });
  }

  const now = context.clock.now();
  const task: Task = {
    id: randomUUID(),
    workspaceId: context.workspaceId,
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.repo.insert(task);
});

const get = module.get.handler(async ({ context, input, errors }) => {
  const task = await context.repo.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});

export const router = module.router({
  create,
  get,
});
```

Grounding rule: handlers implement behavior against the module composition and contract-enforced procedure surface. They do not own service package topology or runtime realization.

## N > 1 Service Module Root

File: `services/example-todo/src/service/router.ts`
Layer: service root router composition

```ts
export const router = impl.router({
  tasks,
  tags,
  assignments,
});

export type Router = typeof router;
```

Grounding rule: a realistic service has more than one module. The final spec must include an N > 1 service module example rather than only a single trivial module.

## Excluded Implementation Shapes

Do not carry these shapes forward from the implementation files:

- non-authoritative package names or import paths;
- plugin internals or API projection internals;
- plugin registration helpers;
- `internal` / `published` registration object names;
- repo package placement;
- app/server/CLI entrypoint mechanics;
- runtime package names;
- raw generated/dist files.

The grounding excerpt supports realistic examples only. The target architecture comes from the synthesis lock.
