import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  buildNativeRuntimeFixture,
  nativeRuntimeScenarios,
  verifyNativeRuntimeScenario,
} from "../support/oclif-runtime-matrix";

const workspace = fileURLToPath(new URL("../../../..", import.meta.url));
let built = "";

beforeAll(async () => {
  built = await mkdtemp(join(tmpdir(), "habitat-native-oclif-build-"));
  await buildNativeRuntimeFixture({
    workspaceRoot: workspace,
    outputRoot: built,
    hostImport: join(workspace, "apps/habitat/dist/host.js"),
    nodeModules: join(workspace, "node_modules"),
  });
}, 30_000);

afterAll(async () => {
  if (built) await rm(built, { recursive: true, force: true });
});

describe("native Oclif process lifetime", () => {
  for (const [index, scenario] of nativeRuntimeScenarios.entries()) {
    // Windows kill() terminates a child rather than delivering POSIX signals to its handlers.
    it.skipIf(process.platform === "win32" && "signal" in scenario)(scenario.name, async () => {
      await verifyNativeRuntimeScenario({
        builtRoot: built,
        dataRoot: join(built, `scenario-${index}`),
        scenario,
      });
    });
  }
});
