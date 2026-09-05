import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "@habitat-ai/sdk/app";
import { defineAgentToolPlugin } from "@habitat-ai/sdk/plugins/agent";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Effect } from "effect";
import type { SourceInventoryResource } from "../../../contract";
import { SourceInventoryRuntimeResource } from "../../../runtime";
import { defineGitSourceInventoryRuntimeProvider } from "../runtime";

test("selected public-realm Git provider captures native services once and observes real files", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-git-runtime-"));
  try {
    expect(Bun.spawnSync(["git", "init", "--quiet", root]).exitCode).toBe(0);
    await writeFile(join(root, "evidence.ts"), "export const evidence = true;");
    const resource = SourceInventoryRuntimeResource;
    const plugin = defineAgentToolPlugin.factory()({
      capability: "git-proof",
      services: {},
      resourceRequirements: [requireResource({ resource, reason: "Read native Git inventory" })],
      tools: [],
    })();
    const app = defineApp({ id: "git-proof", plugins: [plugin] });
    const profile = defineRuntimeProfile({
      id: "git-profile",
      configSources: [{ kind: "memory" }],
      providers: [
        providerSelection({
          resource,
          provider: defineGitSourceInventoryRuntimeProvider(),
          config: { kind: "runtime.config", key: "git" },
        }),
      ],
    });
    const process = defineProcessCatalog({
      test: { id: "git-process", roles: ["agent"], harness: "fixture" },
    }).test;
    const entrypoint = defineEntrypoint({
      id: "git-entry",
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: "git-entry",
        deployment: "test",
        source: "git-provider-test",
      },
    });
    let value: SourceInventoryResource<never> | undefined;
    const started = await startApp(entrypoint, {
      sources: { appRoot: root, memory: { git: {} } },
      finalization: { policy: "waitForNativeStop", deadlineMs: 1000 },
      integrations: [
        {
          surface: "agent/tools",
          harness: {
            id: "fixture",
            roles: ["agent"],
            surfaces: ["agent/tools"],
            async mount(input) {
              value = input.processAccess.resource(resource);
              return { async stop() {} };
            },
          },
        },
      ],
    });
    try {
      expect((await Effect.runPromise(value!.observe({ root, maxEntries: 10 }))).paths).toEqual([
        "evidence.ts",
      ]);
    } finally {
      await started.stop();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
