import { describe, expect, it } from "vitest";

import {
  createArtifactRepositoryReader,
  createArtifactRepositoryStore,
} from "../../../../src/lib/agent-plugins/bindings/output";
import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";
import { createProductionLifecycleDeps } from "../../../../src/lib/agent-plugins/service-runtime/client";

describe("agent-plugin lifecycle output provider selection", () => {
  it("binds the Node providers without performing output work", () => {
    const root = deriveAgentPluginControllerLayout({
      dataRoot: "/tmp/rawr-output-binding-selection",
    }).artifactStoreRoot;
    const reader = createArtifactRepositoryReader(root);
    const store = createArtifactRepositoryStore(root);
    const deps = createProductionLifecycleDeps({
      binding: Object.freeze({ providerExecutables: Object.freeze({}) }),
      controllerDataRoot: "/tmp/rawr-output-binding-selection",
    });

    expect(reader.read).toBeTypeOf("function");
    expect(store.read).toBeTypeOf("function");
    expect(store.publishRelease).toBeTypeOf("function");
    expect(store.publishReleaseSet).toBeTypeOf("function");
    expect(deps.packageOutput.encodeCoworkV1).toBeTypeOf("function");
    expect(deps.packageOutput.publish).toBeTypeOf("function");
    expect(deps).not.toHaveProperty("packaging");
  });
});
