import { lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { deriveAgentPluginControllerLayout } from "../../../../src/lib/agent-plugins/layout";
import {
  createNodeProviderLifecycleDeps,
  createNodeProviderRecordState,
} from "../../../../src/lib/agent-plugins/service-runtime/providers/node-runtime";

describe("provider resource context", () => {
  let fixtureRoot: string | null = null;

  afterEach(async () => {
    if (fixtureRoot !== null) await removeOwnedFixture(fixtureRoot);
    fixtureRoot = null;
  });

  it("keeps provider record state free of lifecycle artifact authority", async () => {
    fixtureRoot = await realpath(await mkdtemp(path.join(tmpdir(), "rawr-c5-provider-records-")));
    const dataRoot = path.join(fixtureRoot, "controller-data");
    await mkdir(dataRoot);
    const layout = deriveAgentPluginControllerLayout({ dataRoot });
    const state = createNodeProviderRecordState({
      controllerDataRoot: dataRoot,
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    });
    const providerExecutables = Object.freeze({ codex: "/opt/rawr/bin/codex" });
    const deps = createNodeProviderLifecycleDeps({
      state,
      providerExecutables,
    });

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(deps)).toBe(true);
    expect(Reflect.ownKeys(state)).toEqual(["records", "projectionRepositoryRoot"]);
    expect(state).not.toHaveProperty("artifactRepository");
    expect(deps.providerRecords).toBe(state.records);
    expect(deps.providerExecutables).toBe(providerExecutables);
    expect(deps.providerProjectionRepositoryRoot).toBe(state.projectionRepositoryRoot);
    expect(Reflect.ownKeys(deps)).toEqual([
      "providerRecords",
      "providerNativeResource",
      "providerExecutables",
      "providerProjectionRepositoryRoot",
    ]);
    expect(deps).not.toHaveProperty("providerArtifactRepository");
    expect(deps).not.toHaveProperty("providerEvidenceStore");
    const reopened = createNodeProviderRecordState({
      controllerDataRoot: dataRoot,
      providerProjectionRoot: layout.providerProjectionRoot,
      providerTargetStateRoot: layout.providerTargetStateRoot,
    });
    expect(Reflect.ownKeys(reopened)).toEqual(["records", "projectionRepositoryRoot"]);
  });
});

async function removeOwnedFixture(root: string): Promise<void> {
  const parent = await realpath(tmpdir());
  if (
    path.dirname(root) !== parent ||
    !path.basename(root).startsWith("rawr-c5-provider-records-")
  ) {
    throw new Error("Refusing recursive cleanup outside the owned provider-record fixture root");
  }
  const status = await lstat(root);
  if (!status.isDirectory() || status.isSymbolicLink() || (await realpath(root)) !== root) {
    throw new Error("Refusing recursive cleanup of a non-canonical provider-record fixture root");
  }
  await rm(root, { recursive: true });
}
