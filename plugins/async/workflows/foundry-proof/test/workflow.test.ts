import { describe, expect, it } from "bun:test";
import { registerFoundryProofWorkflowPlugin } from "../workflow";

describe("@rawr/plugin-async-workflow-foundry-proof", () => {
  it("declares a cold async workflow projection for the capability", () => {
    const plugin = registerFoundryProofWorkflowPlugin();
    expect(plugin.kind).toBe("plugin.async-workflow");
    expect(plugin.capability).toBe("foundry-proof");
    expect(plugin.importSafety).toBe("cold-declaration");
    expect(plugin.workflows?.map((workflow) => workflow.id)).toEqual(["foundry-proof.sync"]);
  });
});
