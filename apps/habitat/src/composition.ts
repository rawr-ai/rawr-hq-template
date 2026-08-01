import { createRequire } from "node:module";

import { NodeServices } from "@effect/platform-node";
import { makeNodeGritRuleEvaluationResource } from "@habitat/resource-rule-evaluation/providers/grit-effect-platform-node";
import { makeNodeGitSourceInventoryResource } from "@habitat/resource-source-inventory/providers/git-effect-platform-node";
import { type Client, createClient, type Deps } from "@habitat/service/client";
import { Effect, FileSystem, Path } from "effect";
import { Type } from "typebox";
import { Validator } from "typebox/schema";

const require = createRequire(import.meta.url);
const gritExecutable = require.resolve("@getgrit/cli/run-grit.js");
const CommandTimeoutSchema = Type.Integer({ minimum: 1, maximum: 600_000 });
const commandTimeoutValidator = new Validator({}, CommandTimeoutSchema);
const commandTimeoutMs = decodeCommandTimeout(process.env.HABITAT_COMMAND_TIMEOUT_MS);
const deps = Effect.runPromise(
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return {
      fileSystem,
      path,
      ruleEvaluation: makeNodeGritRuleEvaluationResource({
        executable: gritExecutable,
        timeoutMs: commandTimeoutMs,
      }),
      sourceInventory: makeNodeGitSourceInventoryResource(),
    } satisfies Deps;
  }).pipe(Effect.provide(NodeServices.layer))
);

/**
 * Constructs the production Habitat client for one workspace.
 *
 * The app selects concrete Node providers here so the service and both
 * projections remain provider-neutral and share one composition boundary.
 */
export async function createHabitatClientForWorkspace(workspaceRoot: string): Promise<Client> {
  const ready = await deps;

  return createClient({
    deps: ready,
    scope: { workspaceRoot: ready.path.resolve(workspaceRoot) },
    config: {},
  });
}

function decodeCommandTimeout(input: string | undefined): number {
  if (input === undefined) return 30_000;
  const value = Number(input);
  if (!commandTimeoutValidator.Check(value)) {
    throw new Error("HABITAT_COMMAND_TIMEOUT_MS must be an integer from 1 through 600000.");
  }
  return value;
}
