import { describe, expect, it } from "vitest";

import {
  createArtifactRepositoryReader,
  createArtifactRepositoryStore,
  createPackageOutputLifecycleRuntime,
} from "../../../../src/lib/agent-plugins/bindings/output";
import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";

describe("agent-plugin lifecycle output provider selection", () => {
  it("binds the Node providers without performing output work", () => {
    const root = deriveAgentPluginControllerLayout({
      dataRoot: "/tmp/rawr-output-binding-selection",
    }).artifactStoreRoot;
    const reader = createArtifactRepositoryReader(root);
    const store = createArtifactRepositoryStore(root);
    const packaging = createPackageOutputLifecycleRuntime({ artifactReader: reader });

    expect(store.read).toBeTypeOf("function");
    expect(store.publishRelease).toBeTypeOf("function");
    expect(store.publishReleaseSet).toBeTypeOf("function");
    expect(packaging.artifactReader).toBe(reader);
    expect(packaging.coworkV1.encode).toBeTypeOf("function");
    expect(packaging.output.publish).toBeTypeOf("function");
  });
});
