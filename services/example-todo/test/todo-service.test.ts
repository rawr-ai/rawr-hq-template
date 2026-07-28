import { safe } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import {
  type AnalyticsEntry,
  createClientOptions,
  createDeps,
  invocation,
  type LogEntry,
  type OrpcErrorShape,
} from "./helpers";

function createIdentifierProbe() {
  let calls = 0;
  const deps = createDeps();

  return {
    deps: {
      ...deps,
      identifierGenerator: {
        generate: () => {
          calls += 1;
          return `00000000-0000-4000-8000-${calls.toString().padStart(12, "0")}`;
        },
      },
    },
    calls: () => calls,
  };
}

describe("example-todo service", () => {
  it("creates and fetches tasks", async () => {
    const client = createClient(createClientOptions());

    const created = await client.tasks.create(
      {
        title: "Ship n=1 todo package",
        description: "Wire TypeBox + direct ORPC boundary errors",
      },
      invocation("trace-create")
    );

    const loaded = await client.tasks.get({ id: created.id }, invocation("trace-load"));

    expect(loaded).toMatchObject({
      id: created.id,
      workspaceId: "workspace-default",
      title: "Ship n=1 todo package",
      completed: false,
    });
    expect(loaded.createdAt).toContain("2026-02-25T00:00:");
  });

  it("uses the host identifier generator for new domain records", async () => {
    const identifiers = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];
    const deps = createDeps();
    const client = createClient(
      createClientOptions({
        deps: {
          ...deps,
          identifierGenerator: {
            generate: () => {
              const identifier = identifiers.shift();
              if (identifier === undefined) throw new Error("Identifier fixture exhausted");
              return identifier;
            },
          },
        },
      })
    );

    const task = await client.tasks.create({ title: "Generated task" }, invocation("trace-task"));
    const tag = await client.tags.create(
      { name: "generated", color: "#112233" },
      invocation("trace-tag")
    );
    const assignment = await client.assignments.assign(
      { taskId: task.id, tagId: tag.id },
      invocation("trace-assignment")
    );

    expect([task.id, tag.id, assignment.id]).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);
    expect(identifiers).toEqual([]);
  });

  it("fixes construction lanes while admitting only invocation context per call", async () => {
    const fixedId = "11111111-1111-4111-8111-111111111111";
    const fixedDeps = {
      ...createDeps(),
      identifierGenerator: {
        generate: () => fixedId,
      },
    };
    const replacementDeps = {
      ...createDeps(),
      identifierGenerator: {
        generate() {
          throw new Error("call-time deps replaced the construction lane");
        },
      },
    };
    const options = createClientOptions({
      deps: fixedDeps,
      workspaceId: "workspace-fixed",
    });
    const client = createClient(options);

    options.deps = replacementDeps;
    options.scope = { workspaceId: "workspace-replaced" };
    options.config = {
      readOnly: true,
      limits: { maxAssignmentsPerTask: 0 },
    };

    let widerLaneReads = 0;
    const widerCallOptions = {
      context: {
        invocation: { traceId: "trace-fixed-construction" },
        get deps() {
          widerLaneReads += 1;
          return replacementDeps;
        },
        get scope() {
          widerLaneReads += 1;
          return { workspaceId: "workspace-call-time" };
        },
        get config() {
          widerLaneReads += 1;
          return {
            readOnly: true,
            limits: { maxAssignmentsPerTask: 0 },
          };
        },
        get provided() {
          widerLaneReads += 1;
          return {
            tasksStore: {
              insert() {
                throw new Error("call-time provided state entered execution context");
              },
            },
          };
        },
      },
    };

    const created = await client.tasks.create(
      { title: "Fixed construction lanes" },
      widerCallOptions
    );

    expect(created).toMatchObject({
      id: fixedId,
      workspaceId: "workspace-fixed",
      title: "Fixed construction lanes",
    });
    expect(widerLaneReads).toBe(0);
  });

  it("refuses an invalid host identifier before store mutation", async () => {
    const deps = createDeps();
    const client = createClient(
      createClientOptions({
        deps: {
          ...deps,
          identifierGenerator: {
            generate: () => "not-a-uuid",
          },
        },
      })
    );

    const result = await safe(
      client.tasks.create({ title: "Invalid identity" }, invocation("trace-invalid-identity"))
    );
    const sql = await deps.dbPool.connect();
    const stored = await sql.queryOne("SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2", [
      "not-a-uuid",
      "workspace-default",
    ]);

    expect(result.isSuccess).toBe(false);
    expect(stored).toBeNull();
  });

  it("consumes identifiers only after write policy accepts an operation", async () => {
    const readOnlyProbe = createIdentifierProbe();
    const readOnlyClient = createClient(
      createClientOptions({ deps: readOnlyProbe.deps, readOnly: true })
    );
    await safe(readOnlyClient.tasks.create({ title: "Blocked" }, invocation("trace-read-only-id")));
    expect(readOnlyProbe.calls()).toBe(0);

    const invalidTitleProbe = createIdentifierProbe();
    const invalidTitleClient = createClient(createClientOptions({ deps: invalidTitleProbe.deps }));
    await safe(invalidTitleClient.tasks.create({ title: "   " }, invocation("trace-title-id")));
    expect(invalidTitleProbe.calls()).toBe(0);

    const duplicateProbe = createIdentifierProbe();
    const duplicateClient = createClient(createClientOptions({ deps: duplicateProbe.deps }));
    await duplicateClient.tags.create(
      { name: "duplicate", color: "#112233" },
      invocation("trace-duplicate-first")
    );
    await safe(
      duplicateClient.tags.create(
        { name: "duplicate", color: "#445566" },
        invocation("trace-duplicate-second")
      )
    );
    expect(duplicateProbe.calls()).toBe(1);

    const limitProbe = createIdentifierProbe();
    const limitClient = createClient(
      createClientOptions({ deps: limitProbe.deps, maxAssignmentsPerTask: 1 })
    );
    const task = await limitClient.tasks.create(
      { title: "Bounded" },
      invocation("trace-limit-task-id")
    );
    const firstTag = await limitClient.tags.create(
      { name: "first", color: "#112233" },
      invocation("trace-limit-first-id")
    );
    const secondTag = await limitClient.tags.create(
      { name: "second", color: "#445566" },
      invocation("trace-limit-second-id")
    );
    await limitClient.assignments.assign(
      { taskId: task.id, tagId: firstTag.id },
      invocation("trace-limit-assignment-id")
    );
    await safe(
      limitClient.assignments.assign(
        { taskId: task.id, tagId: secondTag.id },
        invocation("trace-limit-refusal-id")
      )
    );
    expect(limitProbe.calls()).toBe(4);
  });

  it("keeps workspace-scoped clients isolated", async () => {
    const sharedDeps = createDeps();
    const alpha = createClient({
      deps: sharedDeps,
      scope: { workspaceId: "workspace-alpha" },
      config: {
        readOnly: false,
        limits: { maxAssignmentsPerTask: 2 },
      },
    });
    const beta = createClient({
      deps: sharedDeps,
      scope: { workspaceId: "workspace-beta" },
      config: {
        readOnly: false,
        limits: { maxAssignmentsPerTask: 2 },
      },
    });

    const created = await alpha.tasks.create({ title: "Alpha-only" }, invocation("trace-alpha"));
    const loaded = await alpha.tasks.get({ id: created.id }, invocation("trace-alpha-load"));
    const missing = await safe(beta.tasks.get({ id: created.id }, invocation("trace-beta")));

    expect(loaded.workspaceId).toBe("workspace-alpha");
    expect(missing.isSuccess).toBe(false);
    expect(missing.inferableError).not.toBeNull();
    if (!missing.isSuccess && missing.inferableError !== null) {
      const typed = missing.inferableError as OrpcErrorShape;
      expect(typed.code).toBe("RESOURCE_NOT_FOUND");
    }
  });

  it("composes tasks, tags, and assignments within one router", async () => {
    const client = createClient(createClientOptions());

    const task = await client.tasks.create({ title: "Prepare release" }, invocation("trace-task"));
    const urgent = await client.tags.create(
      { name: "urgent", color: "#ff0000" },
      invocation("trace-urgent")
    );
    const backend = await client.tags.create(
      { name: "backend", color: "#00aa00" },
      invocation("trace-backend")
    );

    await client.assignments.assign(
      { taskId: task.id, tagId: urgent.id },
      invocation("trace-assign-1")
    );
    await client.assignments.assign(
      { taskId: task.id, tagId: backend.id },
      invocation("trace-assign-2")
    );

    const forTask = await client.assignments.listForTask(
      { taskId: task.id },
      invocation("trace-list")
    );

    expect(forTask.task.id).toBe(task.id);
    expect(forTask.tags.map((tag: { name: string }) => tag.name)).toEqual(["backend", "urgent"]);
  });

  it("enforces the configured assignment limit", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 1 }));

    const task = await client.tasks.create({ title: "Limit demo" }, invocation("trace-limit-task"));
    const urgent = await client.tags.create(
      { name: "urgent", color: "#ff0000" },
      invocation("trace-limit-urgent")
    );
    const backend = await client.tags.create(
      { name: "backend", color: "#00aa00" },
      invocation("trace-limit-backend")
    );

    await client.assignments.assign(
      { taskId: task.id, tagId: urgent.id },
      invocation("trace-limit-first")
    );

    const result = await safe(
      client.assignments.assign(
        { taskId: task.id, tagId: backend.id },
        invocation("trace-limit-second")
      )
    );

    expect(result.isSuccess).toBe(false);
    expect(result.inferableError).not.toBeNull();
    if (!result.isSuccess && result.inferableError !== null) {
      const typed = result.inferableError as OrpcErrorShape;
      expect(typed.code).toBe("ASSIGNMENT_LIMIT_REACHED");
    }
  });

  it("allows reads but blocks writes in read-only mode", async () => {
    const baseDeps = createDeps();
    let connectionCount = 0;
    const deps = {
      ...baseDeps,
      dbPool: {
        connect() {
          connectionCount += 1;
          return baseDeps.dbPool.connect();
        },
      },
    };
    const writableClient = createClient({
      deps,
      scope: { workspaceId: "workspace-read-only" },
      config: {
        readOnly: false,
        limits: { maxAssignmentsPerTask: 2 },
      },
    });
    const readOnlyClient = createClient({
      deps,
      scope: { workspaceId: "workspace-read-only" },
      config: {
        readOnly: true,
        limits: { maxAssignmentsPerTask: 2 },
      },
    });

    const created = await writableClient.tasks.create(
      { title: "Seed before read-only" },
      invocation("trace-seed")
    );

    const readResult = await safe(
      readOnlyClient.tasks.get({ id: created.id }, invocation("trace-read"))
    );
    expect(readResult.isSuccess).toBe(true);

    const writeResult = await safe(
      readOnlyClient.tasks.create({ title: "blocked write" }, invocation("trace-blocked"))
    );
    expect(writeResult.isSuccess).toBe(false);
    expect(writeResult.inferableError).not.toBeNull();
    if (!writeResult.isSuccess && writeResult.inferableError !== null) {
      const typed = writeResult.inferableError as OrpcErrorShape;
      expect(typed.code).toBe("READ_ONLY_MODE");
    }
    expect(connectionCount).toBe(3);
  });

  it("keeps service observability and analytics working without an active span", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics, readOnly: true }));

    await safe(client.tasks.create({ title: "blocked write" }, invocation("trace-error")));
    await client.tags.list({}, invocation("trace-success"));

    expect(
      logs.some((entry) => entry.event === "todo.procedure" && entry.payload.outcome === "error")
    ).toBe(true);
    expect(logs.some((entry) => entry.payload.invocationTraceId === "trace-error")).toBe(true);
    expect(logs.some((entry) => entry.payload.invocationTraceId === "trace-success")).toBe(true);
    expect(
      analytics.some(
        (entry) => entry.event === "orpc.procedure" && entry.payload.outcome === "error"
      )
    ).toBe(true);
    expect(
      analytics.some(
        (entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list"
      )
    ).toBe(true);
  });

  it("keeps analytics enrichment stable when the same invocation object is reused concurrently", async () => {
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ analytics }));
    const sharedInvocation = invocation("trace-shared").context.invocation;

    await Promise.all([
      client.tags.list({}, { context: { invocation: sharedInvocation } }),
      client.tags.list({}, { context: { invocation: sharedInvocation } }),
    ]);

    const tagEvents = analytics.filter(
      (entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list"
    );
    expect(tagEvents).toHaveLength(2);
    for (const entry of tagEvents) {
      expect(entry.payload.analytics_layer).toBe("module");
      expect(entry.payload.analytics_module).toBe("tags");
      expect(entry.payload.analytics_workspace_id).toBe("workspace-default");
      expect(entry.payload.analytics_trace_id).toBe("trace-shared");
    }
  });

  it("does not mutate or require extensible invocation objects for analytics", async () => {
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ analytics }));

    await expect(
      client.tags.list(
        {},
        {
          context: {
            invocation: Object.freeze({ traceId: "trace-frozen" }),
          },
        }
      )
    ).resolves.toEqual([]);

    expect(
      analytics.some(
        (entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list"
      )
    ).toBe(true);
  });

  it("fails open when analytics emission throws", async () => {
    const logs: LogEntry[] = [];
    const deps = createDeps({ logs });
    deps.analytics = {
      track() {
        throw new Error("analytics down");
      },
    };

    const client = createClient({
      deps,
      scope: { workspaceId: "workspace-default" },
      config: {
        readOnly: false,
        limits: { maxAssignmentsPerTask: 2 },
      },
    });

    await expect(client.tags.list({}, invocation("trace-analytics-failure"))).resolves.toEqual([]);
    expect(logs.some((entry) => entry.level === "error" && entry.event === "orpc.analytics")).toBe(
      true
    );
  });
});
