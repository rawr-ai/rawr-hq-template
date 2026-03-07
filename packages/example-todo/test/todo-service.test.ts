import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import {
  type AnalyticsEntry,
  createClientOptions,
  createDeps,
  invocation,
  type LogEntry,
  type OrpcErrorShape,
} from "./helpers";

describe("example-todo service", () => {
  it("creates and fetches tasks", async () => {
    const client = createClient(createClientOptions());

    const created = await client.tasks.create(
      {
        title: "Ship n=1 todo package",
        description: "Wire TypeBox + direct ORPC boundary errors",
      },
      invocation("trace-create"),
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
    expect(missing.isDefined).toBe(true);
    if (!missing.isSuccess && missing.isDefined) {
      const typed = missing.error as OrpcErrorShape;
      expect(typed.code).toBe("RESOURCE_NOT_FOUND");
    }
  });

  it("composes tasks, tags, and assignments within one router", async () => {
    const client = createClient(createClientOptions());

    const task = await client.tasks.create({ title: "Prepare release" }, invocation("trace-task"));
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" }, invocation("trace-urgent"));
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" }, invocation("trace-backend"));

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id }, invocation("trace-assign-1"));
    await client.assignments.assign({ taskId: task.id, tagId: backend.id }, invocation("trace-assign-2"));

    const forTask = await client.assignments.listForTask({ taskId: task.id }, invocation("trace-list"));

    expect(forTask.task.id).toBe(task.id);
    expect(forTask.tags.map((tag: { name: string }) => tag.name)).toEqual(["backend", "urgent"]);
  });

  it("enforces the configured assignment limit", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 1 }));

    const task = await client.tasks.create({ title: "Limit demo" }, invocation("trace-limit-task"));
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" }, invocation("trace-limit-urgent"));
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" }, invocation("trace-limit-backend"));

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id }, invocation("trace-limit-first"));

    const result = await safe(
      client.assignments.assign({ taskId: task.id, tagId: backend.id }, invocation("trace-limit-second")),
    );

    expect(result.isSuccess).toBe(false);
    expect(result.isDefined).toBe(true);
    if (!result.isSuccess && result.isDefined) {
      const typed = result.error as OrpcErrorShape;
      expect(typed.code).toBe("ASSIGNMENT_LIMIT_REACHED");
      expect(typed.status).toBe(409);
    }
  });

  it("allows reads but blocks writes in read-only mode", async () => {
    const deps = createDeps();
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

    const created = await writableClient.tasks.create({ title: "Seed before read-only" }, invocation("trace-seed"));

    const readResult = await safe(readOnlyClient.tasks.get({ id: created.id }, invocation("trace-read")));
    expect(readResult.isSuccess).toBe(true);

    const writeResult = await safe(readOnlyClient.tasks.create({ title: "blocked write" }, invocation("trace-blocked")));
    expect(writeResult.isSuccess).toBe(false);
    expect(writeResult.isDefined).toBe(true);
    if (!writeResult.isSuccess && writeResult.isDefined) {
      const typed = writeResult.error as OrpcErrorShape;
      expect(typed.code).toBe("READ_ONLY_MODE");
      expect(typed.status).toBe(409);
    }
  });

  it("keeps invocation logging and analytics observers working", async () => {
    const logs: LogEntry[] = [];
    const analytics: AnalyticsEntry[] = [];
    const client = createClient(createClientOptions({ logs, analytics, readOnly: true }));

    await safe(client.tasks.create({ title: "blocked write" }, invocation("trace-error")));
    await client.tags.list({}, invocation("trace-success"));

    expect(logs.some((entry) => entry.event === "todo.invocation.trace" && entry.level === "info")).toBe(true);
    expect(logs.some((entry) => entry.payload.traceId === "trace-error")).toBe(true);
    expect(logs.some((entry) => entry.payload.traceId === "trace-success")).toBe(true);
    expect(analytics.some((entry) => entry.event === "orpc.procedure" && entry.payload.path === "tags.list")).toBe(true);
  });
});
