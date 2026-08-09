import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { type Client, createClient, type Deps } from "@habitat-ai/catalog-service/client";
import { makeNodeGritRuleEvaluationResource } from "@habitat-ai/resource-rule-evaluation/providers/grit-effect-platform-node";
import { makeNodeGitSourceInventoryResource } from "@habitat-ai/resource-source-inventory/providers/git-effect-platform-node";
import { Effect, FileSystem, Path } from "effect";
import { Type } from "typebox";
import { Validator } from "typebox/schema";

/** Typed local Habitat operations bound to one workspace. */
export type HabitatClient = Client;

const require = createRequire(import.meta.url);
const HABITAT_SDK_PACKAGE_NAME = "@habitat-ai/sdk";
const gritEntrypoint = require.resolve("@getgrit/cli/run-grit.js");
const sdkPackageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
const sdkManifestPath = fileURLToPath(new URL("../habitat-pack.json", import.meta.url));
const CommandTimeoutSchema = Type.Integer({ minimum: 1, maximum: 600_000 });
const commandTimeoutValidator = new Validator({}, CommandTimeoutSchema);
let dependencies: Promise<Deps> | undefined;

/** Constructs the production Habitat client for one workspace. */
export async function createHabitatClientForWorkspace(
  workspaceRoot: string
): Promise<HabitatClient> {
  const ready = await getDependencies();
  const resolvedWorkspaceRoot = ready.path.resolve(workspaceRoot);

  return createClient({
    deps: ready,
    scope: { workspaceRoot: resolvedWorkspaceRoot },
    config: {
      policyPack: {
        name: HABITAT_SDK_PACKAGE_NAME,
        packageJsonPath: sdkPackageJsonPath,
        manifestPath: sdkManifestPath,
      },
    },
  });
}

function getDependencies(): Promise<Deps> {
  dependencies ??= Effect.runPromise(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      return {
        fileSystem,
        path,
        ruleEvaluation: makeNodeGritRuleEvaluationResource({
          command: process.platform === "win32" ? "node" : gritEntrypoint,
          args: process.platform === "win32" ? [gritEntrypoint] : [],
          timeoutMs: decodeCommandTimeout(process.env.HABITAT_COMMAND_TIMEOUT_MS),
        }),
        sourceInventory: makeNodeGitSourceInventoryResource(),
      } satisfies Deps;
    }).pipe(Effect.provide(NodeServices.layer))
  );
  return dependencies;
}

function decodeCommandTimeout(input: string | undefined): number {
  if (input === undefined) return 600_000;
  const value = Number(input);
  if (!commandTimeoutValidator.Check(value)) {
    throw new Error("HABITAT_COMMAND_TIMEOUT_MS must be an integer from 1 through 600000.");
  }
  return value;
}
