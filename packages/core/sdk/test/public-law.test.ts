import { describe, expect, test } from "vitest";

import * as App from "@rawr/sdk/app";
import * as EffectFacade from "@rawr/sdk/effect";
import * as Execution from "@rawr/sdk/execution";
import * as Service from "@rawr/sdk/service";
import * as ServiceSchema from "@rawr/sdk/service/schema";
import * as ServerPlugin from "@rawr/sdk/plugins/server";
import * as ServerPluginEffect from "@rawr/sdk/plugins/server/effect";
import * as AsyncPlugin from "@rawr/sdk/plugins/async";
import * as AsyncPluginEffect from "@rawr/sdk/plugins/async/effect";
import * as CliPlugin from "@rawr/sdk/plugins/cli";
import * as CliPluginEffect from "@rawr/sdk/plugins/cli/effect";
import * as CliPluginSchema from "@rawr/sdk/plugins/cli/schema";
import * as WebPlugin from "@rawr/sdk/plugins/web";
import * as WebPluginEffect from "@rawr/sdk/plugins/web/effect";
import * as AgentPlugin from "@rawr/sdk/plugins/agent";
import * as AgentPluginEffect from "@rawr/sdk/plugins/agent/effect";
import * as AgentPluginSchema from "@rawr/sdk/plugins/agent/schema";
import * as DesktopPlugin from "@rawr/sdk/plugins/desktop";
import * as DesktopPluginEffect from "@rawr/sdk/plugins/desktop/effect";
import * as RuntimeResources from "@rawr/sdk/runtime/resources";
import * as RuntimeProviders from "@rawr/sdk/runtime/providers";
import * as RuntimeProviderEffect from "@rawr/sdk/runtime/providers/effect";
import * as RuntimeProfiles from "@rawr/sdk/runtime/profiles";
import * as RuntimeSchemaFacade from "@rawr/sdk/runtime/schema";
import { defineApp, startApp } from "@rawr/sdk/app";
import { Effect, TaggedError } from "@rawr/sdk/effect";
import { defineService, resourceDep } from "@rawr/sdk/service";
import { schema } from "@rawr/sdk/service/schema";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "@rawr/sdk/plugins/async";
import { defineAsyncStepEffect } from "@rawr/sdk/plugins/async/effect";
import { defineServerApiPlugin } from "@rawr/sdk/plugins/server";
import { implementServerApiPlugin } from "@rawr/sdk/plugins/server/effect";
import { defineCommand } from "@rawr/sdk/plugins/cli/effect";
import { cliSchema } from "@rawr/sdk/plugins/cli/schema";
import { defineWebAppPlugin } from "@rawr/sdk/plugins/web";
import { defineTool } from "@rawr/sdk/plugins/agent/effect";
import { toolSchema } from "@rawr/sdk/plugins/agent/schema";
import { defineDesktopBackground } from "@rawr/sdk/plugins/desktop/effect";
import { defineRuntimeResource } from "@rawr/sdk/runtime/resources";
import { defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import { providerFx } from "@rawr/sdk/runtime/providers/effect";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";

describe("@rawr/sdk public law", () => {
  test("imports every locked public subpath", () => {
    expect([
      App,
      EffectFacade,
      Execution,
      Service,
      ServiceSchema,
      ServerPlugin,
      ServerPluginEffect,
      AsyncPlugin,
      AsyncPluginEffect,
      CliPlugin,
      CliPluginEffect,
      CliPluginSchema,
      WebPlugin,
      WebPluginEffect,
      AgentPlugin,
      AgentPluginEffect,
      AgentPluginSchema,
      DesktopPlugin,
      DesktopPluginEffect,
      RuntimeResources,
      RuntimeProviders,
      RuntimeProviderEffect,
      RuntimeProfiles,
      RuntimeSchemaFacade,
    ]).toHaveLength(24);
  });

  test("keeps app and plugin declarations cold", async () => {
    const ClockResource = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "time source",
    });
    const service = defineService({
      id: "work-items",
      deps: {
        clock: resourceDep(ClockResource),
      },
      scope: RuntimeSchema.struct({
        workspaceId: RuntimeSchema.string({ minLength: 1 }),
      }),
    });
    const plugin = defineServerApiPlugin.factory()({
      capability: "work-items",
      routeBase: "/work-items",
      services: {
        workItems: { kind: "service.use", service },
      },
    });
    const profile = defineRuntimeProfile({
      id: "local",
      providers: [],
    });
    const app = defineApp({
      id: "hq",
      plugins: [plugin],
      profiles: [profile],
    });

    expect(app.kind).toBe("rawr.app");
    expect(plugin.importSafety).toBe("cold-declaration");
    await expect(startApp(app, {
      entrypointId: "hq.server",
      profile,
      roles: ["server"],
    })).resolves.toMatchObject({ kind: "started-app" });
  });

  test("declares resources, providers, profiles, schemas, and provider plans", () => {
    const ClockResource = defineRuntimeResource<"clock", { now(): Date }>({
      id: "clock",
      title: "Clock",
      purpose: "time source",
    });
    const provider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "clock.system",
      title: "System clock",
      provides: ClockResource,
      requires: [],
      build: () => providerFx.acquireRelease({
        acquire: () => Effect.succeed({ now: () => new Date(0) }),
      }),
    });
    const selection = providerSelection({
      resource: ClockResource,
      provider,
      lifetime: "process",
    });
    const profile = defineRuntimeProfile({
      id: "test",
      providers: [selection],
      configSources: [{ kind: "env" }],
    });

    expect(profile.providers?.[0]?.kind).toBe("provider.selection");
    expect(RuntimeSchema.redactedString().redacted).toBe(true);
    expect(schema.object({ id: schema.string() }).parse({ id: "1" })).toEqual({ id: "1" });
    expect(cliSchema.string().parse("ok")).toBe("ok");
    expect(toolSchema.string().parse("ok")).toBe("ok");
  });

  test("exposes executable descriptors without raw runtime authority", () => {
    const ref = Execution.defineExecutionDescriptorRef({
      boundary: "plugin.server-api",
      executionId: "hq.server-api.work-items.list",
      appId: "hq",
      role: "server",
      surface: "server-api",
      capability: "work-items",
      routePath: ["GET", "/work-items"],
    });
    const effectExports = Object.keys(Effect);
    expect(effectExports).not.toContain("runPromise");
    expect(effectExports).not.toContain("ManagedRuntime");
    expect(ref.routePath).toEqual(["GET", "/work-items"]);

    class BoundaryError extends TaggedError("BoundaryError")<{ reason: string }> {}
    expect(new BoundaryError({ reason: "nope" })._tag).toBe("BoundaryError");

    const os = implementServerApiPlugin({}, { pluginId: "server.api.test" });
    const route = os.create.effect(() => Effect.succeed({ ok: true }));
    const step = defineAsyncStepEffect({
      id: "sync",
      effect: () => Effect.succeed({ ok: true }),
    });
    const workflow = defineWorkflow({
      id: "sync.workflow",
      run: async () => undefined,
    });
    const asyncPlugin = defineAsyncWorkflowPlugin.factory()({
      capability: "sync",
      workflows: [workflow],
    });
    const command = defineCommand({ id: "work-items.create" }).effect(() =>
      Effect.succeed(0),
    );
    const webPlugin = defineWebAppPlugin.factory()({ capability: "board" });
    const tool = defineTool({ id: "lookup", effect: () => Effect.succeed({}) });
    const desktop = defineDesktopBackground({
      id: "status",
      effect: () => Effect.succeed(undefined),
    });

    expect(route.kind).toBe("server.route-implementation");
    expect(step.kind).toBe("async.step-effect");
    expect(asyncPlugin.kind).toBe("plugin.async-workflow");
    expect(command.kind).toBe("cli.command-effect");
    expect(webPlugin.kind).toBe("plugin.web-app");
    expect(tool.kind).toBe("agent.tool-effect");
    expect(desktop.kind).toBe("desktop.effect");
  });
});
