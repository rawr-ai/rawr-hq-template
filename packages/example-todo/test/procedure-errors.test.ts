import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import { createClientOptions, createInvocation, type OrpcErrorShape } from "./helpers";
import { contract as assignmentsContract } from "../src/service/modules/assignments/contract";
import { contract as tagsContract } from "../src/service/modules/tags/contract";
import { contract as tasksContract } from "../src/service/modules/tasks/contract";

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
  it("declares READ_ONLY_MODE only on mutating procedures", () => {
    expect("READ_ONLY_MODE" in tasksContract.create["~orpc"].errorMap).toBe(true);
    expect("READ_ONLY_MODE" in tagsContract.create["~orpc"].errorMap).toBe(true);
    expect("READ_ONLY_MODE" in assignmentsContract.assign["~orpc"].errorMap).toBe(true);

    expect("READ_ONLY_MODE" in tasksContract.get["~orpc"].errorMap).toBe(false);
    expect("READ_ONLY_MODE" in tagsContract.list["~orpc"].errorMap).toBe(false);
    expect("READ_ONLY_MODE" in assignmentsContract.listForTask["~orpc"].errorMap).toBe(false);
  });

  it("returns READ_ONLY_MODE when write procedures are called in read-only mode", async () => {
    const client = createClient(createClientOptions({ readOnly: true }));

    await expectOrpcError(
      client.tasks.create({ title: "blocked write" }, createInvocation("trace-read-only")),
      {
        code: "READ_ONLY_MODE",
        status: 409,
      },
    );
  });

  it("returns INVALID_TASK_TITLE for whitespace title after normalization", async () => {
    const client = createClient(createClientOptions());

    await expectOrpcError(
      client.tasks.create({ title: "   " }, createInvocation("trace-invalid-title")),
      {
        code: "INVALID_TASK_TITLE",
        status: 400,
        data: { title: "   " },
      },
    );
  });

  it("returns DUPLICATE_TAG when creating same tag name twice", async () => {
    const client = createClient(createClientOptions());

    await client.tags.create({ name: "infra", color: "#123456" }, createInvocation("trace-first-tag"));

    await expectOrpcError(
      client.tags.create({ name: "infra", color: "#654321" }, createInvocation("trace-second-tag")),
      {
        code: "DUPLICATE_TAG",
        status: 409,
        data: { name: "infra" },
      },
    );
  });

  it("returns RESOURCE_NOT_FOUND when assignment references missing task", async () => {
    const client = createClient(createClientOptions());
    const tag = await client.tags.create({ name: "ops", color: "#00aaff" }, createInvocation("trace-tag"));

    await expectOrpcError(
      client.assignments.assign({
        taskId: "00000000-0000-0000-0000-000000000001",
        tagId: tag.id,
      }, createInvocation("trace-missing-task")),
      {
        code: "RESOURCE_NOT_FOUND",
        status: 404,
        data: { entity: "Task", id: "00000000-0000-0000-0000-000000000001" },
      },
    );
  });

  it("returns ALREADY_ASSIGNED when same task/tag pair is assigned twice", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 2 }));
    const task = await client.tasks.create({ title: "Review PR" }, createInvocation("trace-task"));
    const tag = await client.tags.create({ name: "review", color: "#ff6600" }, createInvocation("trace-tag"));

    await client.assignments.assign({ taskId: task.id, tagId: tag.id }, createInvocation("trace-first-assign"));

    await expectOrpcError(
      client.assignments.assign({ taskId: task.id, tagId: tag.id }, createInvocation("trace-second-assign")),
      {
        code: "ALREADY_ASSIGNED",
        status: 409,
        data: { taskId: task.id, tagId: tag.id },
      },
    );
  });

  it("returns ASSIGNMENT_LIMIT_REACHED when configured assignment cap is exceeded", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 1 }));
    const task = await client.tasks.create({ title: "Capped task" }, createInvocation("trace-cap-task"));
    const firstTag = await client.tags.create({ name: "first", color: "#101010" }, createInvocation("trace-cap-tag-1"));
    const secondTag = await client.tags.create({ name: "second", color: "#202020" }, createInvocation("trace-cap-tag-2"));

    await client.assignments.assign({ taskId: task.id, tagId: firstTag.id }, createInvocation("trace-cap-first"));

    await expectOrpcError(
      client.assignments.assign({ taskId: task.id, tagId: secondTag.id }, createInvocation("trace-cap-second")),
      {
        code: "ASSIGNMENT_LIMIT_REACHED",
        status: 409,
        data: {
          taskId: task.id,
          maxAssignmentsPerTask: 1,
        },
      },
    );
  });

  it("treats unexpected storage failure as non-defined internal error", async () => {
    const client = createClient(
      createClientOptions({
        failIfQueryIncludes: ["SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2"],
      }),
    );

    const result = await safe(
      client.tasks.get({ id: "00000000-0000-0000-0000-000000000001" }, createInvocation("trace-storage-failure")),
    );
    expect(result.isSuccess).toBe(false);
    expect(result.isDefined).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects schema-invalid input before repository execution", async () => {
    const client = createClient(
      createClientOptions({
        failIfQueryIncludes: ["SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2"],
      }),
    );

    const result = await safe(client.tasks.get({ id: "not-a-uuid" }, createInvocation("trace-invalid-id")));
    expect(result.isSuccess).toBe(false);

    if (!result.isSuccess) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      expect(message).not.toContain("forced failure for queryOne");
    }
  });
});
