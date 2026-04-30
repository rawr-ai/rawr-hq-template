import { describe, expect, it } from "bun:test";
import { FoundryProofService, createFoundryProofClient } from "../src";

describe("@rawr/foundry-proof", () => {
  it("keeps generated service metadata and client behavior stable", () => {
    expect(FoundryProofService.kind).toBe("service.definition");
    expect(FoundryProofService.id).toBe("foundry-proof");
    expect(createFoundryProofClient().ping({ message: "ready" })).toEqual({
      ok: true,
      capability: "foundry-proof",
      message: "foundry-proof:ready",
    });
  });
});
