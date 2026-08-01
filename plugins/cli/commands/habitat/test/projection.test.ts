import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { bindHabitatClient, habitatClientFrom } from "@habitat/plugin-cli/binding";
import { type Client, createClient } from "@habitat/service/client";
import { Config } from "@oclif/core";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it, vi } from "vitest";

type CheckInput = Parameters<Client["catalog"]["check"]>[0];

const resolved: Awaited<ReturnType<Client["catalog"]["resolve"]>> = {
  _tag: "Resolved",
  catalog: {
    schemaVersion: 3,
    blueprints: [],
    instances: [],
    applications: [],
    compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
  },
};

const completed: Awaited<ReturnType<Client["catalog"]["check"]>> = {
  _tag: "Completed",
  applications: [],
  ok: true,
};

function projectionClient(options?: {
  readonly check?: Client["catalog"]["check"];
  readonly resolve?: Client["catalog"]["resolve"];
}): Client {
  return {
    catalog: {
      check: options?.check ?? (async () => completed),
      resolve: options?.resolve ?? (async () => resolved),
    },
  };
}

async function loadProjection(client?: Client): Promise<Config> {
  const options: Config["options"] = {
    name: "habitat-projection-test",
    root: fileURLToPath(new URL("..", import.meta.url)),
  };
  return Config.load(client === undefined ? options : bindHabitatClient(options, client));
}

describe("Habitat Oclif projection binding", () => {
  it("preserves the app-selected client through native Oclif config loading", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          const workspaceRoot = yield* fileSystem.makeTempDirectoryScoped({
            prefix: "habitat-oclif-projection-",
          });
          const client = createClient({
            deps: {
              fileSystem,
              path,
              ruleEvaluation: {
                evaluate: () => Effect.die("empty catalog must not evaluate a rule"),
              },
              sourceInventory: {
                observe: () => Effect.die("empty catalog must not acquire source inventory"),
              },
            },
            scope: { workspaceRoot },
            config: {},
          });
          const config = yield* Effect.promise(() => loadProjection(client));

          expect(habitatClientFrom(config)).toBe(client);
          expect(config.commandIDs).toEqual(["check", "hook", "resolve"]);
          const resolved = yield* Effect.promise(() => config.runCommand("resolve"));
          const checked = yield* Effect.promise(() => config.runCommand("check"));
          const hooked = yield* Effect.promise(() => config.runCommand("hook", ["agent-stop"]));
          expect(resolved).toMatchObject({ _tag: "Resolved" });
          expect(checked).toEqual({ _tag: "Completed", applications: [], ok: true });
          expect(hooked).toEqual({ _tag: "Completed", applications: [], ok: true });
        })
      ).pipe(Effect.provide(NodeServices.layer))
    );
  });

  it("projects native selector flags without widening explicit empty values", async () => {
    const inputs: CheckInput[] = [];
    const check: Client["catalog"]["check"] = async (input) => {
      inputs.push(input);
      return completed;
    };
    const config = await loadProjection(projectionClient({ check }));

    await config.runCommand("check", ["--rule", "one"]);
    await config.runCommand("check", [
      "--owner",
      "owner",
      "--instance",
      "instance",
      "--rule",
      "one",
      "--rule",
      "two",
      "--runner",
      "grit",
    ]);
    await config.runCommand("check", ["--owner="]);
    await config.runCommand("hook", ["agent-stop"]);

    expect(inputs).toEqual([
      { selectors: { rule: "one" } },
      {
        selectors: {
          instance: "instance",
          owner: "owner",
          rules: ["one", "two"],
          runner: "grit",
        },
      },
      { selectors: { owner: "" } },
      { selectors: { runner: "habitat" } },
    ]);
  });

  it("prints total failures before native Oclif exits nonzero", async () => {
    const rejected: Awaited<ReturnType<Client["catalog"]["resolve"]>> = {
      _tag: "Rejected",
      issues: [{ code: "authority-blueprint-missing", message: "missing", path: ".habitat" }],
    };
    const failed: Awaited<ReturnType<Client["catalog"]["check"]>> = {
      _tag: "Completed",
      applications: [],
      ok: false,
    };
    const catalogRejected: Awaited<ReturnType<Client["catalog"]["check"]>> = {
      _tag: "CatalogRejected",
      issues: [{ code: "authority-blueprint-missing", message: "missing", path: ".habitat" }],
    };
    const selectionRejected: Awaited<ReturnType<Client["catalog"]["check"]>> = {
      _tag: "SelectionRejected",
      issues: [{ code: "selector-empty", message: "empty", selector: "owner" }],
    };
    const resolveInputs: Parameters<Client["catalog"]["resolve"]>[0][] = [];
    const checkResults = [failed, catalogRejected, selectionRejected];
    let checkIndex = 0;
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const config = await loadProjection(
        projectionClient({
          check: async () => checkResults[checkIndex++] ?? failed,
          resolve: async (input) => {
            resolveInputs.push(input);
            return rejected;
          },
        })
      );
      await expect(config.runCommand("resolve")).rejects.toMatchObject({ oclif: { exit: 1 } });
      await expect(config.runCommand("check")).rejects.toMatchObject({ oclif: { exit: 1 } });
      await expect(config.runCommand("check")).rejects.toMatchObject({ oclif: { exit: 1 } });
      await expect(config.runCommand("check")).rejects.toMatchObject({ oclif: { exit: 1 } });
      await expect(config.runCommand("hook", ["agent-stop"])).rejects.toMatchObject({
        oclif: { exit: 1 },
      });
      expect(resolveInputs).toEqual([{}]);
      expect(output.mock.calls).toEqual(
        [rejected, failed, catalogRejected, selectionRejected, failed].map((result) => [
          JSON.stringify(result, null, 2),
        ])
      );
    } finally {
      output.mockRestore();
    }
  });

  it("refuses native command dispatch without an app-owned binding", async () => {
    const config = await loadProjection();
    await expect(config.runCommand("resolve")).rejects.toThrow(
      "The Habitat app did not supply its service binding."
    );
  });
});
