import { describe, expect, it } from "vitest";
import { safe } from "@orpc/server";
import { createClient } from "../src";
import { createClientOptions, invocation, type OrpcErrorShape } from "./helpers";
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
      client.tasks.create({ title: "blocked write" }, invocation("trace-read-only")),
      {
        code: "READ_ONLY_MODE",
        status: 409,
      },
    );
  });

  it("returns INVALID_TASK_TITLE for whitespace title after normalization", async () => {
    const client = createClient(createClientOptions());

    await expectOrpcError(
      client.tasks.create({ title: "   " }, invocation("trace-invalid-title")),
      {
        code: "INVALID_TASK_TITLE",
        status: 400,
        data: { title: "   " },
      },
    );
  });

  it("returns DUPLICATE_TAG when creating same tag name twice", async () => {
    const client = createClient(createClientOptions());

    await client.tags.create({ name: "infra", color: "#123456" }, invocation("trace-tag-1"));

    await expectOrpcError(
      client.tags.create({ name: "infra", color: "#654321" }, invocation("trace-tag-2")),
      {
        code: "DUPLICATE_TAG",
        status: 409,
        data: { name: "infra" },
      },
    );
  });

  it("returns RESOURCE_NOT_FOUND when assignment references missing task", async () => {
    const client = createClient(createClientOptions());
    const tag = await client.tags.create({ name: "ops", color: "#00aaff" }, invocation("trace-tag"));

    await expectOrpcError(
      client.assignments.assign({
        taskId: "00000000-0000-0000-0000-000000000001",
        tagId: tag.id,
      }, invocation("trace-missing-task")),
      {
        code: "RESOURCE_NOT_FOUND",
        status: 404,
        data: { entity: "Task", id: "00000000-0000-0000-0000-000000000001" },
      },
    );
  });

  it("returns ALREADY_ASSIGNED when same task/tag pair is assigned twice", async () => {
    const client = createClient(createClientOptions());
    const task = await client.tasks.create({ title: "Review PR" }, invocation("trace-task"));
    const tag = await client.tags.create({ name: "review", color: "#ff6600" }, invocation("trace-tag"));

    await client.assignments.assign({ taskId: task.id, tagId: tag.id }, invocation("trace-assign"));

    await expectOrpcError(
      client.assignments.assign({ taskId: task.id, tagId: tag.id }, invocation("trace-duplicate")),
      {
        code: "ALREADY_ASSIGNED",
        status: 409,
        data: { taskId: task.id, tagId: tag.id },
      },
    );
  });

  it("returns ASSIGNMENT_LIMIT_REACHED when configured assignment ceiling is hit", async () => {
    const client = createClient(createClientOptions({ maxAssignmentsPerTask: 1 }));
    const task = await client.tasks.create({ title: "Bounded task" }, invocation("trace-limit-task"));
    const urgent = await client.tags.create({ name: "urgent", color: "#ff0000" }, invocation("trace-limit-tag-1"));
    const backend = await client.tags.create({ name: "backend", color: "#00aa00" }, invocation("trace-limit-tag-2"));

    await client.assignments.assign({ taskId: task.id, tagId: urgent.id }, invocation("trace-limit-assign-1"));

    await expectOrpcError(
      client.assignments.assign({ taskId: task.id, tagId: backend.id }, invocation("trace-limit-assign-2")),
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

    const result = await safe(client.tasks.get(
      { id: "00000000-0000-0000-0000-000000000001" },
      invocation("trace-storage-failure"),
    ));
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

    const result = await safe(client.tasks.get({ id: "not-a-uuid" }, invocation("trace-invalid-schema")));
    expect(result.isSuccess).toBe(false);

    if (!result.isSuccess) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      expect(message).not.toContain("forced failure for queryOne");
    }
  });
});
