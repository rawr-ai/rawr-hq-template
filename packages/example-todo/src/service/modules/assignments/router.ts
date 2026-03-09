/**
 * @fileoverview Assignments module router implementation.
 *
 * @remarks
 * Module setup lives in `./setup.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `setup.ts` owns module setup, including module-local additive middleware.
 * This module is composite; cross-module orchestration belongs in handlers here.
 * Do not route through client-to-client calls inside the same domain package.
 */
import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";
import { os } from "./setup";
import {
  createServiceMiddleware,
  type ServiceDeps,
  type ServiceInvocation,
  type ServiceScope,
} from "../../base";
import { type Assignment } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `os.<procedure>.handler(...)`.
 */
type AssignBranchMiddleware = Parameters<typeof os.assign.use>[0];

const assignProcedureObservability = createServiceMiddleware<{
  deps: Pick<ServiceDeps, "logger">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>().middleware(async ({ context, next }, rawInput) => {
  const input = rawInput as {
    taskId: string;
    tagId: string;
  };

  trace.getActiveSpan()?.addEvent("todo.assignments.assign.requested", {
    workspace_id: context.scope.workspaceId,
    task_id: input.taskId,
    tag_id: input.tagId,
  });
  context.deps.logger.info("todo.assignments.assign.requested", {
    layer: "procedure",
    procedure: "assignments.assign",
    workspaceId: context.scope.workspaceId,
    invocationTraceId: context.invocation.traceId,
    taskId: input.taskId,
    tagId: input.tagId,
  });

  return next();
}) as AssignBranchMiddleware;

const assignProcedureAnalytics = createServiceMiddleware<{
  deps: Pick<ServiceDeps, "analytics">;
  scope: Pick<ServiceScope, "workspaceId">;
  invocation: Pick<ServiceInvocation, "traceId">;
}>().middleware(async ({ context, next }, rawInput) => {
  const input = rawInput as {
    taskId: string;
    tagId: string;
  };
  let outcome: "success" | "error" = "success";

  try {
    return await next();
  }
  catch (error) {
    outcome = "error";
    throw error;
  }
  finally {
    await context.deps.analytics.track("todo.mock.procedure.analytics", {
      layer: "procedure",
      procedure: "assignments.assign",
      outcome,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
      taskId: input.taskId,
      tagId: input.tagId,
    });
  }
}) as AssignBranchMiddleware;

const assign = os.assign
  .use(assignProcedureObservability)
  .use(assignProcedureAnalytics)
  .handler(async ({ context, input, errors }) => {
  const task = await context.provided.tasks.findById(input.taskId);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.taskId}' not found`,
      data: { entity: "Task", id: input.taskId },
    });
  }

  const tag = await context.provided.tags.findById(input.tagId);
  if (!tag) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Tag '${input.tagId}' not found`,
      data: { entity: "Tag", id: input.tagId },
    });
  }

  if (await context.provided.repo.exists(input.taskId, input.tagId)) {
    throw errors.ALREADY_ASSIGNED({
      message: `Task '${input.taskId}' already has tag '${input.tagId}'`,
      data: { taskId: input.taskId, tagId: input.tagId },
    });
  }

  const existingAssignments = await context.provided.repo.countByTask(input.taskId);
  if (existingAssignments >= context.config.limits.maxAssignmentsPerTask) {
    throw errors.ASSIGNMENT_LIMIT_REACHED({
      message: `Task '${input.taskId}' already has the maximum number of tag assignments`,
      data: {
        taskId: input.taskId,
        maxAssignmentsPerTask: context.config.limits.maxAssignmentsPerTask,
      },
    });
  }

  const assignment: Assignment = {
    id: randomUUID(),
    workspaceId: context.scope.workspaceId,
    taskId: input.taskId,
    tagId: input.tagId,
    createdAt: context.deps.clock.now(),
  };

  return await context.provided.repo.insert(assignment);
});

const listForTask = os.listForTask.handler(async ({ context, input, errors }) => {
  const task = await context.provided.tasks.findById(input.taskId);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.taskId}' not found`,
      data: { entity: "Task", id: input.taskId },
    });
  }

  const assignments = await context.provided.repo.findByTask(input.taskId);
  if (assignments.length === 0) {
    return { task, tags: [] };
  }

  const tags = await context.provided.tags.findByIds(assignments.map((assignment) => assignment.tagId));
  return { task, tags };
});

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = os.router({
  assign,
  listForTask,
});
