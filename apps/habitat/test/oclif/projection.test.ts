import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { Client } from "@habitat-ai/catalog-service/client";
import { Config } from "@oclif/core";
import { describe, expect, it, vi } from "vitest";
import type { OclifRuntimeBinding } from "../../src/harness/oclif/binding";
import type { OclifSourceBundle } from "../../src/host";

const { sourceBundle } = createRequire(import.meta.url)("../../dist/oclif.js") as {
  readonly sourceBundle: OclifSourceBundle;
};

const resolved: Awaited<ReturnType<Client["catalog"]["resolve"]>> = {
  _tag: "Resolved",
  catalog: {
    schemaVersion: 3,
    policyPack: { name: "@habitat-ai/sdk", version: "0.3.1", protocolVersion: 1, blueprints: [] },
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

function loadProjection(binding?: OclifRuntimeBinding): Promise<Config> {
  return Config.load({
    root: fileURLToPath(new URL("../..", import.meta.url)),
    ...(binding === undefined ? {} : { habitatRuntime: binding }),
  });
}

describe("Habitat native Oclif projection", () => {
  it("retains native vendor commands alongside only the selected topic inventory", async () => {
    const config = await loadProjection({
      presentation: false,
      onFinally() {},
      invoke: async () => resolved,
    });
    expect(Object.keys(sourceBundle.COMMANDS).sort()).toEqual([
      "agent:plugins:check",
      "agent:plugins:package",
      "agent:plugins:status",
      "agent:plugins:sync",
      "agent:plugins:test",
      "agent:plugins:vendors:update",
      "check",
      "cli:command:create",
      "cli:extension:create",
      "hook",
      "resolve",
    ]);
    expect([...config.commandIDs].sort()).toEqual([
      "agent:plugins:check",
      "agent:plugins:package",
      "agent:plugins:status",
      "agent:plugins:sync",
      "agent:plugins:test",
      "agent:plugins:vendors:update",
      "check",
      "cli:command:create",
      "cli:extension:create",
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
    await expect(config.runCommand("resolve")).resolves.toEqual(resolved);
  });

  it("uses native argument and repeated-flag parsing with exact source/ref dispatch", async () => {
    const calls: Parameters<OclifRuntimeBinding["invoke"]>[] = [];
    const config = await loadProjection({
      presentation: false,
      onFinally() {},
      invoke: async (...input) => {
        calls.push(input);
        return completed;
      },
    });
    await config.runCommand("check", ["--owner=", "--rule", "one", "--rule", "two"]);
    await config.runCommand("hook", ["agent-stop"]);
    await config.runCommand("cli:command:create", ["foundation", "echo", "--dry-run"]);
    await config.runCommand("cli:extension:create", ["sample", "--destination", "sample"]);
    expect(calls[0]?.[2]).toMatchObject({ args: {}, flags: { owner: "", rule: ["one", "two"] } });
    expect(calls[1]?.[2]).toMatchObject({ args: { name: "agent-stop" } });
    expect(calls[2]?.[2]).toMatchObject({
      args: { topic: "foundation", name: "echo" },
      flags: { "dry-run": true },
    });
    expect(calls[3]?.[2]).toMatchObject({
      args: { id: "sample" },
      flags: { destination: "sample" },
    });
    for (const [ref, source] of calls) {
      expect(
        sourceBundle.entries.find((entry) => entry.ref.executionId === ref.executionId)?.source
      ).toBe(source);
    }
    await expect(config.runCommand("hook", ["not-a-hook"])).rejects.toThrow();
  });

  it("awaits topic presentation before native exit and leaves program result shape unchanged", async () => {
    const rejected = {
      _tag: "Rejected",
      issues: [{ code: "authority-blueprint-missing", message: "missing", path: ".habitat" }],
    };
    const writes: string[] = [];
    const output = vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
      encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
      callback?: (error?: Error | null) => void
    ) => {
      writes.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      (typeof encodingOrCallback === "function" ? encodingOrCallback : callback)?.();
      return true;
    }) as typeof process.stdout.write);
    try {
      const config = await loadProjection({
        presentation: true,
        onFinally() {},
        invoke: async () => rejected,
      });
      await expect(config.runCommand("resolve")).rejects.toMatchObject({ oclif: { exit: 1 } });
      expect(writes).toEqual([`${JSON.stringify(rejected, null, 2)}\n`]);
    } finally {
      output.mockRestore();
    }
  });

  it("refuses command execution without a selected admission binding", async () => {
    const config = await loadProjection();
    await expect(config.runCommand("resolve")).rejects.toThrow(
      "Native Oclif dispatch has no selected Habitat admission binding."
    );
  });
});
