import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { contract } from "../src/service/contract";
import { router } from "../src/router";
import { createClientOptions } from "./helpers";

describe("agent-config-sync service shell", () => {
  it("keeps the public boundary and root contract intact", () => {
    expect(typeof createClient).toBe("function");
    expect(createClient(createClientOptions())).toBeDefined();
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["planning", "execution", "retirement", "undo"]);
    expect(Object.keys(contract.planning)).toEqual([
      "planWorkspaceSync",
      "assessWorkspaceSync",
      "evaluateFullSyncPolicy",
    ]);
    expect(Object.keys(contract.execution)).toEqual(["runSync"]);
    expect(Object.keys(contract.retirement)).toEqual(["retireStaleManaged"]);
    expect(Object.keys(contract.undo)).toEqual(["runUndo"]);
  });
});
