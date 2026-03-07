import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import {
  createClientOptions,
  createDeps,
  createInvocation,
  type LogEntry,
  type OrpcErrorShape,
} from "./helpers";

describe("example-todo service", () => {
  it("creates and fetches tasks", async () => {
    const client = createClient(createClientOptions());

    const created = await client.tasks.create({
      title: "Ship n=1 todo package",
      description: "Wire TypeBox + direct ORPC boundary errors",
    }, createInvocation("trace-create"));

    const loaded = await client.tasks.get({ id: created.id }, createInvocation("trace-get"));

    expect(loaded).toMatchObject({
      id: created.id,
      workspaceId: "workspace-default",
      title: "Ship n=1 todo package",
      completed: false,
    });
    expect(loaded.createdAt).toContain("2026-02-25T00:00:");
  });

  it("composes tasks, tags, and assignments within one router", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 4 }));

    const task = await client.tasks.create({ title: "Prepare release" }, createInvocation("trace-task"));
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" }, createInvocation("trace-urgent"));
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" }, createInvocation("trace-backend"));

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id }, createInvocation("trace-assign-urgent"));
    await client.assignments.assign({ taskId: task.id, tagId: backend.id }, createInvocation("trace-assign-backend"));

    const forTask = await client.assignments.listForTask({ taskId: task.id }, createInvocation("trace-list"));

    expect(forTask.task.id).toBe(task.id);
    expect(forTask.tags.map((tag: { name: string }) => tag.name)).toEqual(["backend", "urgent"]);
  });

  it("partitions task reads by required workspace scope", async () => {
    const deps = createDeps();
    const alpha = createClient({
      deps,
      scope: { workspaceId: "workspace-alpha" },
      config: { readOnly: false, limits: { maxAssignmentsPerTask: 2 } },
    });
    const beta = createClient({
      deps,
      scope: { workspaceId: "workspace-beta" },
      config: { readOnly: false, limits: { maxAssignmentsPerTask: 2 } },
    });

    const created = await alpha.tasks.create({ title: "Scoped task" }, createInvocation("trace-alpha-create"));

    const ownRead = await safe(alpha.tasks.get({ id: created.id }, createInvocation("trace-alpha-get")));
    expect(ownRead.isSuccess).toBe(true);

    const crossWorkspaceRead = await safe(beta.tasks.get({ id: created.id }, createInvocation("trace-beta-get")));
    expect(crossWorkspaceRead.isSuccess).toBe(false);
    expect(crossWorkspaceRead.isDefined).toBe(true);
    if (!crossWorkspaceRead.isSuccess && crossWorkspaceRead.isDefined) {
      const typed = crossWorkspaceRead.error as OrpcErrorShape;
      expect(typed.code).toBe("RESOURCE_NOT_FOUND");
      expect(typed.status).toBe(404);
    }
  });

  it("allows reads but blocks writes in read-only mode", async () => {
    const deps = createDeps();
    const client = createClient({
      deps,
      scope: { workspaceId: "workspace-default" },
      config: { readOnly: false, limits: { maxAssignmentsPerTask: 2 } },
    });
    const created = await client.tasks.create({ title: "Seed before read-only" }, createInvocation("trace-seed"));

    const readOnlyClient = createClient({
      deps,
      scope: { workspaceId: "workspace-default" },
      config: { readOnly: true, limits: { maxAssignmentsPerTask: 2 } },
    });
    const readResult = await safe(readOnlyClient.tasks.get({ id: created.id }, createInvocation("trace-read")));
    expect(readResult.isSuccess).toBe(true);

    const writeResult = await safe(
      readOnlyClient.tasks.create({ title: "blocked write" }, createInvocation("trace-blocked-write")),
    );
    expect(writeResult.isSuccess).toBe(false);
    expect(writeResult.isDefined).toBe(true);
    if (!writeResult.isSuccess && writeResult.isDefined) {
      const typed = writeResult.error as OrpcErrorShape;
      expect(typed.code).toBe("READ_ONLY_MODE");
      expect(typed.status).toBe(409);
    }
  });

  it("enforces the configured assignment limit", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 1 }));

    const task = await client.tasks.create({ title: "Limit me" }, createInvocation("trace-limit-task"));
    const firstTag = await client.tags.create({ name: "first", color: "#111111" }, createInvocation("trace-limit-tag-1"));
    const secondTag = await client.tags.create({ name: "second", color: "#222222" }, createInvocation("trace-limit-tag-2"));

    await client.assignments.assign({ taskId: task.id, tagId: firstTag.id }, createInvocation("trace-limit-assign-1"));

    const secondAssignment = await safe(
      client.assignments.assign({ taskId: task.id, tagId: secondTag.id }, createInvocation("trace-limit-assign-2")),
    );
    expect(secondAssignment.isSuccess).toBe(false);
    expect(secondAssignment.isDefined).toBe(true);
    if (!secondAssignment.isSuccess && secondAssignment.isDefined) {
      const typed = secondAssignment.error as OrpcErrorShape;
      expect(typed.code).toBe("ASSIGNMENT_LIMIT_REACHED");
      expect(typed.status).toBe(409);
      expect(typed.data).toMatchObject({
        taskId: task.id,
        maxAssignmentsPerTask: 1,
      });
    }
  });

  it("emits telemetry for success, failure, and invocation trace paths", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createClientOptions({ logs, readOnly: true }));

    await safe(client.tasks.create({ title: "blocked write" }, createInvocation("trace-blocked")));
    await client.tags.list({}, createInvocation("trace-list"));

    expect(logs.some((entry) => entry.event === "todo.procedure.error" && entry.level === "error")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.procedure.success" && entry.level === "info")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.invocation.trace" && entry.payload.traceId === "trace-list")).toBe(true);
  });
});
