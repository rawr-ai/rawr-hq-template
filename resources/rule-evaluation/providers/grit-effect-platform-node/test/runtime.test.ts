import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "@habitat-ai/sdk/app";
import { defineAgentToolPlugin } from "@habitat-ai/sdk/plugins/agent";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Effect } from "effect";
import type { RuleEvaluationResource } from "../../../contract";
import { RuleEvaluationRuntimeResource } from "../../../runtime";
import { defineGritRuleEvaluationRuntimeProvider } from "../runtime";

test("selected public-realm Grit provider executes the real evaluator after acquisition", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-grit-runtime-"));
  try {
    const subject = join(root, "evidence.ts");
    await writeFile(subject, "forbidden();");
    const grit = createRequire(import.meta.url).resolve("@getgrit/cli/run-grit.js");
    const resource = RuleEvaluationRuntimeResource;
    const plugin = defineAgentToolPlugin.factory()({
      capability: "grit-proof",
      services: {},
      resourceRequirements: [requireResource({ resource, reason: "Run native evaluator" })],
      tools: [],
    })();
    const app = defineApp({ id: "grit-proof", plugins: [plugin] });
    const profile = defineRuntimeProfile({
      id: "grit-profile",
      configSources: [{ kind: "memory" }],
      providers: [
        providerSelection({
          resource,
          provider: defineGritRuleEvaluationRuntimeProvider(),
          config: { kind: "runtime.config", key: "grit" },
        }),
      ],
    });
    const process = defineProcessCatalog({
      test: { id: "grit-process", roles: ["agent"], harness: "fixture" },
    }).test;
    const entrypoint = defineEntrypoint({
      id: "grit-entry",
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: "grit-entry",
        deployment: "test",
        source: "grit-provider-test",
      },
    });
    let value: RuleEvaluationResource<never> | undefined;
    const started = await startApp(entrypoint, {
      sources: {
        appRoot: root,
        memory: {
          grit: {
            command: globalThis.process.platform === "win32" ? "node" : grit,
            args: globalThis.process.platform === "win32" ? [grit] : [],
            timeoutMs: 60_000,
          },
        },
      },
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
      expect(
        (
          await Effect.runPromise(
            value!.evaluate({
              programs: [{ id: "forbidden", program: "language js(typescript)\n`forbidden()`" }],
              subjectPaths: [subject],
            })
          )
        ).results[0]?.findings
      ).toHaveLength(1);
    } finally {
      await started.stop();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
