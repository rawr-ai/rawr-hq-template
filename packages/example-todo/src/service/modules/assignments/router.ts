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
import { os } from "./setup";
import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
} from "../../base";
import { type Assignment } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `os.<procedure>.handler(...)`.
 */
const assignProcedureObservability = createServiceObservabilityMiddleware({
  onStarted: ({ span, context, pathLabel }) => {
    span?.addEvent("todo.assignments.assign.requested", {
      workspace_id: context.scope.workspaceId,
      path: pathLabel,
    });
    context.deps.logger.info("todo.assignments.assign.requested", {
      layer: "procedure",
      procedure: pathLabel,
      workspaceId: context.scope.workspaceId,
      invocationTraceId: context.invocation.traceId,
    });
  },
});

const assignProcedureAnalytics = createServiceAnalyticsMiddleware({
  payload: ({ context, pathLabel, outcome }) => ({
    analytics_layer: "procedure",
    analytics_procedure: pathLabel,
    analytics_outcome: outcome,
    analytics_workspace_id: context.scope.workspaceId,
    analytics_trace_id: context.invocation.traceId,
  }),
});

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
