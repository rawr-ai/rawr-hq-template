import { describe, expect, it } from "vitest";
import { createTodoClient } from "../src";
import { createTodoDeps } from "./helpers";

describe("example-todo service", () => {
  it("creates and fetches tasks", async () => {
    const client = createTodoClient(createTodoDeps());

    const created = await client.tasks.create({
      title: "Ship n=1 todo package",
      description: "Wire TypeBox + neverthrow + ORPC errors",
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
    const client = createTodoClient(createTodoDeps());

    const task = await client.tasks.create({ title: "Prepare release" });
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" });
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" });

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id });
    await client.assignments.assign({ taskId: task.id, tagId: backend.id });

    const forTask = await client.assignments.listForTask({ taskId: task.id });

    expect(forTask.task.id).toBe(task.id);
    expect(forTask.tags.map((tag) => tag.name)).toEqual(["backend", "urgent"]);
  });
});
