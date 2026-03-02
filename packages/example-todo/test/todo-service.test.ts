import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import { createDeps, type OrpcErrorShape, type LogEntry } from "./helpers";

describe("example-todo service", () => {
  it("creates and fetches tasks", async () => {
    const client = createClient(createDeps());

    const created = await client.tasks.create({
      title: "Ship n=1 todo package",
      description: "Wire TypeBox + direct ORPC boundary errors",
    });

    const loaded = await client.tasks.get({ id: created.id });

    expect(loaded).toMatchObject({
      id: created.id,
      title: "Ship n=1 todo package",
      completed: false,
    });
    expect(loaded.createdAt).toContain("2026-02-25T00:00:");
  });

  it("composes tasks, tags, and assignments within one router", async () => {
    const client = createClient(createDeps());

    const task = await client.tasks.create({ title: "Prepare release" });
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" });
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" });

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id });
    await client.assignments.assign({ taskId: task.id, tagId: backend.id });

    const forTask = await client.assignments.listForTask({ taskId: task.id });

    expect(forTask.task.id).toBe(task.id);
    expect(forTask.tags.map((tag: { name: string }) => tag.name)).toEqual(["backend", "urgent"]);
  });

  it("allows reads but blocks writes in read-only mode", async () => {
    const deps = createDeps();
    const client = createClient(deps);
    const created = await client.tasks.create({ title: "Seed before read-only" });
    deps.runtime.readOnly = true;

    const readResult = await safe(client.tasks.get({ id: created.id }));
    expect(readResult.isSuccess).toBe(true);

    const writeResult = await safe(client.tasks.create({ title: "blocked write" }));
    expect(writeResult.isSuccess).toBe(false);
    expect(writeResult.isDefined).toBe(true);
    if (!writeResult.isSuccess && writeResult.isDefined) {
      const typed = writeResult.error as OrpcErrorShape;
      expect(typed.code).toBe("READ_ONLY_MODE");
      expect(typed.status).toBe(409);
    }
  });

  it("emits telemetry for success and failure paths", async () => {
    const logs: LogEntry[] = [];
    const client = createClient(createDeps({ logs, readOnly: true }));

    await safe(client.tasks.create({ title: "blocked write" }));
    await client.tags.list({});

    expect(logs.some((entry) => entry.event === "todo.procedure.error" && entry.level === "error")).toBe(true);
    expect(logs.some((entry) => entry.event === "todo.procedure.success" && entry.level === "info")).toBe(true);
  });
});
