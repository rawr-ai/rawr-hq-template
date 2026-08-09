import { fileURLToPath } from "node:url";

import type { HabitatClient } from "@habitat-ai/sdk";
import { Config } from "@oclif/core";
import { describe, expect, it, vi } from "vitest";
import { bindHabitatClient, habitatClientFrom } from "../../src/lib/binding";

type CheckInput = Parameters<HabitatClient["catalog"]["check"]>[0];

const resolved: Awaited<ReturnType<HabitatClient["catalog"]["resolve"]>> = {
  _tag: "Resolved",
  catalog: {
    schemaVersion: 3,
    policyPack: {
      name: "@habitat-ai/sdk",
      version: "0.3.1",
      protocolVersion: 1,
      blueprints: [],
    },
    blueprints: [],
    instances: [],
    applications: [],
    compatibility: { schemaVersion: 2, ownerRoots: {}, rules: [] },
  },
};

const completed: Awaited<ReturnType<HabitatClient["catalog"]["check"]>> = {
  _tag: "Completed",
  applications: [],
  ok: true,
};

function projectionClient(options?: {
  readonly check?: HabitatClient["catalog"]["check"];
  readonly resolve?: HabitatClient["catalog"]["resolve"];
}): HabitatClient {
  return {
    catalog: {
      check: options?.check ?? (async () => completed),
      resolve: options?.resolve ?? (async () => resolved),
    },
  };
}

async function loadProjection(client?: HabitatClient): Promise<Config> {
  const options: Config["options"] = {
    name: "habitat-projection-test",
    root: fileURLToPath(new URL("../..", import.meta.url)),
  };
  return Config.load(client === undefined ? options : bindHabitatClient(options, client));
}

describe("Habitat Oclif projection binding", () => {
  it("preserves the app-selected client through native Oclif config loading", async () => {
    const client = projectionClient();
    const config = await loadProjection(client);

    expect(habitatClientFrom(config)).toBe(client);
    expect([...config.commandIDs].sort()).toEqual([
      "check",
      "help",
      "hook",
      "plugins",
      "plugins:add",
      "plugins:inspect",
      "plugins:install",
      "plugins:link",
      "plugins:remove",
      "plugins:reset",
      "plugins:uninstall",
      "plugins:unlink",
      "plugins:update",
      "resolve",
    ]);
    await expect(config.runCommand("resolve")).resolves.toMatchObject({ _tag: "Resolved" });
    await expect(config.runCommand("check")).resolves.toEqual(completed);
    await expect(config.runCommand("hook", ["agent-stop"])).resolves.toEqual(completed);
  });

  it("projects native selector flags without widening explicit empty values", async () => {
    const inputs: CheckInput[] = [];
    const check: HabitatClient["catalog"]["check"] = async (input) => {
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
    const rejected: Awaited<ReturnType<HabitatClient["catalog"]["resolve"]>> = {
      _tag: "Rejected",
      issues: [{ code: "authority-blueprint-missing", message: "missing", path: ".habitat" }],
    };
    const failed: Awaited<ReturnType<HabitatClient["catalog"]["check"]>> = {
      _tag: "Completed",
      applications: [],
      ok: false,
    };
    const catalogRejected: Awaited<ReturnType<HabitatClient["catalog"]["check"]>> = {
      _tag: "CatalogRejected",
      issues: [{ code: "authority-blueprint-missing", message: "missing", path: ".habitat" }],
    };
    const selectionRejected: Awaited<ReturnType<HabitatClient["catalog"]["check"]>> = {
      _tag: "SelectionRejected",
      issues: [{ code: "selector-empty", message: "empty", selector: "owner" }],
    };
    const resolveInputs: Parameters<HabitatClient["catalog"]["resolve"]>[0][] = [];
    const checkResults = [failed, catalogRejected, selectionRejected];
    let checkIndex = 0;
    const writes: string[] = [];
    const output = vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
      encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void
    ) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      const complete = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
      complete?.();
      return true;
    }) as typeof process.stdout.write);

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
      expect(writes).toEqual(
        [rejected, failed, catalogRejected, selectionRejected, failed].map(
          (result) => `${JSON.stringify(result, null, 2)}\n`
        )
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
