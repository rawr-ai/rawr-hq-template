import { describe, expect, it } from "bun:test";
import { registerFoundryProofServerApiPlugin } from "../server";

describe("@rawr/plugin-server-api-foundry-proof", () => {
  it("declares a cold server API projection for the capability", () => {
    const plugin = registerFoundryProofServerApiPlugin();
    expect(plugin.kind).toBe("plugin.server");
    expect(plugin.surface).toBe("api");
    expect(plugin.capability).toBe("foundry-proof");
    expect(plugin.importSafety).toBe("cold-declaration");
    expect(Object.keys(plugin.services)).toEqual(["foundryProof"]);
  });
});
