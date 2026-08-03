import * as publicApi from "../../../src/client";
import { createClient } from "../../../src/client";
import { describe, expect, it } from "vitest";
import { contract } from "../../../src/service/contract";
import { router } from "../../../src/service/router";
import { createClientOptions } from "../../support/service/helpers";

describe("hyperresearch-codex service shell", () => {
  it("keeps the public boundary and root contract aligned with the service-package shape", () => {
    expect(typeof createClient).toBe("function");
    expect(createClient(createClientOptions())).toBeDefined();
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["fixtures", "runs"]);
    expect(Object.keys(contract.fixtures)).toEqual(["runSyntheticSlice"]);
    expect(Object.keys(contract.runs)).toEqual([
      "startV8Run",
      "advanceV8Run",
      "inspectV8Run",
      "validateV8Run",
    ]);
  });

  it("keeps package mechanics behind the public service boundary", () => {
    expect(Object.keys(publicApi).sort()).toEqual(["createClient"]);
  });
});
