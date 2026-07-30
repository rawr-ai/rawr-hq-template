import { getHiddenRouterContract } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { contract } from "../../../src/service/contract";
import { getTodoProcedureMetadata } from "../../../src/service/model/policy/procedure-metadata";
import { contract as assignmentsContract } from "../../../src/service/modules/assignments/contract";
import { contract as tagsContract } from "../../../src/service/modules/tags/contract";
import { contract as tasksContract } from "../../../src/service/modules/tasks/contract";
import { router } from "../../../src/service/router";

function expectEffectiveProcedureMeta(
  meta: unknown,
  expectedIdempotent: boolean,
  analytics?: {
    layer: "module" | "procedure";
    module?: "assignments" | "tags";
    operation?: "tags.create";
  }
) {
  expect(meta).toEqual({
    idempotent: expectedIdempotent,
    domain: "todo",
    audience: "internal",
    audit: "basic",
    entity: "service",
    ...(analytics ? { analytics } : {}),
  });
}

describe("example-todo procedure metadata", () => {
  it("retains the native contract relation on the completed service router", () => {
    expect(getHiddenRouterContract(router)).toBe(contract);
  });

  it("keeps operation metadata local and inherits service defaults at composition", () => {
    expect(getTodoProcedureMetadata(tasksContract.create)).toEqual({ idempotent: false });
    expect(getTodoProcedureMetadata(tasksContract.get)).toEqual({ idempotent: true });
    expect(getTodoProcedureMetadata(tagsContract.create)).toEqual({
      idempotent: false,
      analytics: { layer: "procedure", module: "tags", operation: "tags.create" },
    });
    expect(getTodoProcedureMetadata(tagsContract.list)).toEqual({
      idempotent: true,
      analytics: { layer: "module", module: "tags" },
    });
    expect(getTodoProcedureMetadata(assignmentsContract.assign)).toEqual({
      idempotent: false,
      analytics: { layer: "module", module: "assignments" },
    });
    expect(getTodoProcedureMetadata(assignmentsContract.listForTask)).toEqual({
      idempotent: true,
      analytics: { layer: "module", module: "assignments" },
    });

    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.tasks.create), false);
    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.tasks.get), true);
    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.tags.create), false, {
      layer: "procedure",
      module: "tags",
      operation: "tags.create",
    });
    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.tags.list), true, {
      layer: "module",
      module: "tags",
    });
    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.assignments.assign), false, {
      layer: "module",
      module: "assignments",
    });
    expectEffectiveProcedureMeta(getTodoProcedureMetadata(contract.assignments.listForTask), true, {
      layer: "module",
      module: "assignments",
    });
  });
});
