import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const workspace = path.resolve(import.meta.dir, "../../../../..");
const owner = "@habitat-ai/plugin-agent-plugins";
const topic = "plugins/cli/topics/agent-plugins";
const overlay = ".habitat/overlays/agent-plugin-lifecycle";
const sourceRule = "require_agent_plugin_lifecycle_projection";
const structureRule = "require_agent_plugin_lifecycle_commands";

test("qualified native overlay admits public projection and rejects ownership perturbations", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "habitat-agent-plugin-law-"));
  async function files(entries: Readonly<Record<string, string>>) {
    for (const [relative, text] of Object.entries(entries)) {
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), text);
    }
  }
  async function check(rule: string) {
    const child = Bun.spawn(
      [path.join(workspace, "node_modules/.bin/habitat"), "check", "--rule", rule],
      {
        cwd: root,
        env: { ...process.env, NO_COLOR: "1", GRIT_TELEMETRY_DISABLED: "true" },
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 25_000);
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]).finally(() => clearTimeout(timer));
    if (timedOut) throw new Error("Native overlay check did not settle");
    const result = JSON.parse(stdout) as {
      _tag: string;
      ok: boolean;
      applications: { status: string; findings: { path: string }[] }[];
    };
    expect(result._tag, stderr || stdout).toBe("Completed");
    expect(result.applications).toHaveLength(1);
    return { code, result, findings: result.applications[0].findings };
  }
  try {
    await cp(path.join(workspace, overlay), path.join(root, overlay), { recursive: true });
    await cp(path.join(workspace, topic, "src"), path.join(root, topic, "src"), {
      recursive: true,
    });
    await symlink(path.join(workspace, "node_modules"), path.join(root, "node_modules"));
    await files({
      "package.json": JSON.stringify({ name: "agent-plugin-law-fixture", private: true }),
      ".habitat/index.json": JSON.stringify({ schemaVersion: 2, ownerRoots: { [owner]: topic } }),
      [`${topic}/project.json`]: JSON.stringify({ name: owner }),
      [`${topic}/src/allowed.ts`]: [
        'import type { Client, Contract } from "@habitat-ai/agent-plugin-lifecycle-service/client";',
        'import { parsePluginId as admit } from "@habitat-ai/agent-plugin-lifecycle-service/client";',
        'const note = "@habitat-ai/agent-plugin-lifecycle-service/private";',
        'void import("effect", { with: { note: "@habitat-ai/agent-plugin-lifecycle-service/private" } });',
        "export const helper = (input: unknown) => admit(input);",
      ].join("\n"),
    });
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    for (const rule of [sourceRule, structureRule]) {
      const positive = await check(rule);
      expect(positive.code, JSON.stringify(positive.result)).toBe(0);
      expect(positive.result.ok).toBe(true);
      expect(positive.findings).toEqual([]);
    }

    const checkSource = await readFile(path.join(root, topic, "src/commands/check.ts"), "utf8");
    const packageSource = await readFile(path.join(root, topic, "src/commands/package.ts"), "utf8");
    const forbidden = {
      [`${topic}/src/commands/check.ts`]: checkSource.replace(
        'id: "agent:plugins:check"',
        'id: "rawr:agent:plugins:check"'
      ),
      [`${topic}/src/commands/package.ts`]: packageSource.replace(
        'id: "agent:plugins:package",',
        'id: "agent:plugins:package", aliases: ["plugins:package"],'
      ),
      [`${topic}/src/private-static.ts`]:
        'import type { Request } from "@habitat-ai/agent-plugin-lifecycle-service/src/service/model/dto/request";',
      [`${topic}/src/private-relative.ts`]:
        'export * from "../../../../../services/agent-plugin-lifecycle/src/service/router";',
      [`${topic}/src/private-dynamic.ts`]:
        'void import("@habitat-ai/agent-plugin-lifecycle-service/private", { with: { type: "json" } });',
      [`${topic}/src/private-required.ts`]:
        'require("@habitat-ai/agent-plugin-lifecycle-service");',
      [`${topic}/src/direct-client.ts`]:
        'import { createClient as construct } from "@habitat-ai/agent-plugin-lifecycle-service/client";',
      [`${topic}/src/direct-namespace.ts`]:
        'import * as lifecycle from "@habitat-ai/agent-plugin-lifecycle-service/client"; const construct = lifecycle.createClient;',
      [`${topic}/src/second-use.ts`]:
        'import { useService as use } from "@habitat-ai/sdk/plugins/cli";',
      [`${topic}/src/services.ts`]:
        'import { useService } from "@habitat-ai/sdk/plugins/cli"; export const services = { lifecycle: useService(otherService) };',
    };
    await files(forbidden);
    const negative = await check(sourceRule);
    expect(negative.code).not.toBe(0);
    expect(negative.result.ok).toBe(false);
    expect([...new Set(negative.findings.map(({ path }) => path))].sort()).toEqual(
      Object.keys(forbidden).sort()
    );

    await rm(path.join(root, topic, "src/commands/sync.ts"));
    await files({
      [`${topic}/src/commands/undo.ts`]: "export {};",
      [`${topic}/src/commands/vendors/status.ts`]: "export {};",
    });
    const invalidInventory = await check(structureRule);
    expect(invalidInventory.code).not.toBe(0);
    expect(invalidInventory.result.ok).toBe(false);
    expect(invalidInventory.findings.length).toBeGreaterThanOrEqual(3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
