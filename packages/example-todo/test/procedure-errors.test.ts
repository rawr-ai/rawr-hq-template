import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import { createDeps, type OrpcErrorShape } from "./helpers";

async function expectOrpcError(
  promise: Promise<unknown>,
  expected: {
    code: string;
    status: number;
    data?: Record<string, unknown>;
  },
) {
  const result = await safe(promise);
  expect(result.isSuccess).toBe(false);
  expect(result.isDefined).toBe(true);

  if (result.isSuccess || !result.isDefined) {
    throw new Error(`expected defined ORPC error ${expected.code}`);
  }

  const typed = result.error as OrpcErrorShape;
  expect(typed.code).toBe(expected.code);
  expect(typed.status).toBe(expected.status);

  if (expected.data) {
    expect(typed.data).toMatchObject(expected.data);
  }
}

describe("example-todo typed procedure errors", () => {
  it("returns INVALID_TASK_TITLE for whitespace title after normalization", async () => {
    const client = createClient(createDeps());

    await expectOrpcError(
      client.tasks.create({ title: "   " }),
      {
        code: "INVALID_TASK_TITLE",
        status: 400,
        data: { title: "   " },
      },
    );
  });

  it("returns DUPLICATE_TAG when creating same tag name twice", async () => {
    const client = createClient(createDeps());

    await client.tags.create({ name: "infra", color: "#123456" });

    await expectOrpcError(
      client.tags.create({ name: "infra", color: "#654321" }),
      {
        code: "DUPLICATE_TAG",
        status: 409,
        data: { name: "infra" },
      },
    );
  });

  it("returns RESOURCE_NOT_FOUND when assignment references missing task", async () => {
    const client = createClient(createDeps());
    const tag = await client.tags.create({ name: "ops", color: "#00aaff" });

    await expectOrpcError(
      client.assignments.assign({
        taskId: "00000000-0000-0000-0000-000000000001",
        tagId: tag.id,
      }),
      {
        code: "RESOURCE_NOT_FOUND",
        status: 404,
        data: { entity: "Task", id: "00000000-0000-0000-0000-000000000001" },
      },
    );
  });

  it("returns ALREADY_ASSIGNED when same task/tag pair is assigned twice", async () => {
    const client = createClient(createDeps());
    const task = await client.tasks.create({ title: "Review PR" });
    const tag = await client.tags.create({ name: "review", color: "#ff6600" });

    await client.assignments.assign({ taskId: task.id, tagId: tag.id });

    await expectOrpcError(
      client.assignments.assign({ taskId: task.id, tagId: tag.id }),
      {
        code: "ALREADY_ASSIGNED",
        status: 409,
        data: { taskId: task.id, tagId: tag.id },
      },
    );
  });

  it("treats unexpected storage failure as non-defined internal error", async () => {
    const client = createClient(
      createDeps({
        failIfQueryIncludes: ["SELECT * FROM tasks WHERE id = $1"],
      }),
    );

    const result = await safe(client.tasks.get({ id: "00000000-0000-0000-0000-000000000001" }));
    expect(result.isSuccess).toBe(false);
    expect(result.isDefined).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects schema-invalid input before repository execution", async () => {
    const client = createClient(
      createDeps({
        failIfQueryIncludes: ["SELECT * FROM tasks WHERE id = $1"],
      }),
    );

    const result = await safe(client.tasks.get({ id: "not-a-uuid" }));
    expect(result.isSuccess).toBe(false);

    if (!result.isSuccess) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      expect(message).not.toContain("forced failure for queryOne");
    }
  });
});
