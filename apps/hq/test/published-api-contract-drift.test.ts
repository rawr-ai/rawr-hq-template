import { describe, expect, it } from "vitest";
import { createRawrHqManifest } from "../rawr.hq";

describe("hq published api composition selection", () => {
  const manifest = createRawrHqManifest();

  it("publishes only the example-todo API capability from HQ declarations", () => {
    expect(manifest.roles.server.api.exampleTodo.declaration?.published?.contract).toBeDefined();
    expect(manifest.roles.server.api.state.declaration?.published).toBeUndefined();
  });
});
