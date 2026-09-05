import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "@habitat-ai/sdk/app";
import { defineAgentToolPlugin } from "@habitat-ai/sdk/plugins/agent";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Effect } from "effect";
import type { FilesystemResource } from "../../../contract";
import { FilesystemRuntimeResource } from "../../../runtime";
import { defineNodeFilesystemRuntimeProvider } from "../index";

test("public SDK realm acquires the selected filesystem provider and performs native file work", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-filesystem-"));
  try {
    await writeFile(join(root, "evidence"), "native filesystem");
    const requirement = requireResource({
      resource: FilesystemRuntimeResource,
      reason: "Read fixture evidence",
    });
    const plugin = defineAgentToolPlugin.factory()({
      capability: "filesystem-proof",
      services: {},
      resourceRequirements: [requirement],
      tools: [],
    })();
    const app = defineApp({ id: "filesystem-proof", plugins: [plugin] });
    const profile = defineRuntimeProfile({
      id: "filesystem-profile",
      providers: [
        providerSelection({
          resource: FilesystemRuntimeResource,
          provider: defineNodeFilesystemRuntimeProvider(),
        }),
      ],
    });
    const process = defineProcessCatalog({
      test: { id: "filesystem-process", roles: ["agent"], harness: "fixture" },
    }).test;
    const entrypoint = defineEntrypoint({
      id: "filesystem-entry",
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: "filesystem-entry",
        deployment: "test",
        source: "filesystem-provider-test",
      },
    });
    let value: FilesystemResource | undefined;
    const started = await startApp(entrypoint, {
      sources: { appRoot: root },
      finalization: { policy: "waitForNativeStop", deadlineMs: 1000 },
      integrations: [
        {
          surface: "agent/tools",
          harness: {
            id: "fixture",
            roles: ["agent"],
            surfaces: ["agent/tools"],
            async mount(input) {
              value = input.processAccess.resource(FilesystemRuntimeResource);
              return { async stop() {} };
            },
          },
        },
      ],
    });
    try {
      expect(value).toBeDefined();
      expect(
        await Effect.runPromise(
          value!.fileSystem.readFileString(value!.path.join(root, "evidence"))
        )
      ).toBe("native filesystem");
    } finally {
      await started.stop();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
