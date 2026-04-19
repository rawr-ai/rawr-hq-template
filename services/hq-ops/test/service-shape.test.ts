import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { contract } from "../src/service/contract";
import { router } from "../src/router";

describe("hq-ops service shell", () => {
  it("keeps the public boundary and root contract intact", () => {
    expect(typeof createClient).toBe("function");
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["config", "repoState", "journal", "security"]);
    expect(Object.keys(contract.config)).toEqual(["reservation"]);
    expect(Object.keys(contract.repoState)).toEqual(["getState"]);
    expect(Object.keys(contract.journal)).toEqual(["reservation"]);
    expect(Object.keys(contract.security)).toEqual(["reservation"]);
  });
});
