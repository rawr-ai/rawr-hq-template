import { getHiddenRouterContract } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { contract } from "../src/service/contract";
import { contract as assignmentsContract } from "../src/service/modules/assignments/contract";
import { contract as tagsContract } from "../src/service/modules/tags/contract";
import { contract as tasksContract } from "../src/service/modules/tasks/contract";
import { router } from "../src/service/router";

type ProcedureMeta = {
  domain: string;
  audience: string;
  idempotent: boolean;
};

function expectProcedureMeta(meta: unknown, expectedIdempotent: boolean) {
  const typed = meta as ProcedureMeta;
  expect(typed.domain).toBe("todo");
  expect(typed.audience).toBe("internal");
  expect(typed.idempotent).toBe(expectedIdempotent);
}

describe("example-todo procedure metadata", () => {
  it("retains the native contract relation on the completed service router", () => {
    expect(getHiddenRouterContract(router)).toBe(contract);
  });

  it("applies shared domain/audience and explicit idempotency to each procedure", () => {
    expectProcedureMeta(tasksContract.create["~orpc"].meta, false);
    expectProcedureMeta(tasksContract.get["~orpc"].meta, true);

    expectProcedureMeta(tagsContract.create["~orpc"].meta, false);
    expectProcedureMeta(tagsContract.list["~orpc"].meta, true);

    expectProcedureMeta(assignmentsContract.assign["~orpc"].meta, false);
    expectProcedureMeta(assignmentsContract.listForTask["~orpc"].meta, true);
  });
});
