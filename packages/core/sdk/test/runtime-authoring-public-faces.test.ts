import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const expectedRuntimeExports = [
  "./app",
  "./effect",
  "./execution",
  "./runtime/profiles",
  "./runtime/providers",
  "./runtime/resources",
  "./runtime/schema",
];

const expectedPluginExports = [
  "./plugins/async",
  "./plugins/async/effect",
  "./plugins/server",
  "./plugins/server/effect",
];

describe("runtime authoring public faces", () => {
  test("cold-imports only the task 4.1 runtime authoring operations", async () => {
    const [app, effect, execution, profiles, providers, resources, runtimeSchema, service] =
      await Promise.all([
        import("../src/app"),
        import("../src/effect"),
        import("../src/execution"),
        import("../src/runtime/profiles"),
        import("../src/runtime/providers"),
        import("../src/runtime/resources"),
        import("../src/runtime/schema"),
        import("../src/service"),
      ]);

    expect(Object.keys(app).sort()).toEqual([
      "defineApp",
      "defineEntrypoint",
      "defineProcessCatalog",
      "runtimeLaunchIdentity",
    ]);
    expect(Object.keys(effect).sort()).toEqual(["Effect", "TaggedError"]);
    expect(Object.keys(execution)).toEqual([]);
    expect(Object.keys(profiles)).toEqual(["defineRuntimeProfile"]);
    expect(Object.keys(providers)).toEqual(["defineRuntimeProvider"]);
    expect(Object.keys(resources).sort()).toEqual(["defineRuntimeResource", "requireResource"]);
    expect(Object.keys(runtimeSchema).sort()).toEqual([
      "RuntimeLifecyclePhaseSchema",
      "RuntimeObservationRecordSchema",
      "RuntimeSchema",
    ]);
    expect(Object.keys(service).sort()).toEqual([
      "createAnalyticsMiddlewareCallback",
      "createObservabilityMiddlewareCallback",
      "defineService",
      "getProcedureMetadata",
      "procedureMetadata",
      "resourceDep",
      "semanticDep",
      "serviceDep",
      "useService",
    ]);

    for (const face of [app, effect, execution, profiles, providers, resources, runtimeSchema]) {
      expect(face).not.toHaveProperty("startApp");
      expect(face).not.toHaveProperty("providerSelection");
      expect(face).not.toHaveProperty("ProviderEffectPlan");
      expect(face).not.toHaveProperty("providerFx");
      expect(face).not.toHaveProperty("build");
      expect(face).not.toHaveProperty("ManagedRuntime");
      expect(face).not.toHaveProperty("runPromise");
    }
  });

  test("preserves the exact task 4.1 runtime package subpaths without future empty faces", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { exports: Record<string, unknown> };
    const runtimeExports = Object.keys(packageJson.exports)
      .filter(
        (subpath) =>
          ["./app", "./effect", "./execution"].includes(subpath) || subpath.startsWith("./runtime/")
      )
      .sort();

    expect(runtimeExports).toEqual(expectedRuntimeExports);
    expect(packageJson.exports).not.toHaveProperty("./runtime/providers/effect");
    expect(packageJson.exports).not.toHaveProperty("./runtime/harnesses");
  });

  test("cold-imports only the task 4.2 server and async authoring operations", async () => {
    const [server, asyncPlugin, asyncEffect, service, pluginDefinitions, executionDefinitions] =
      await Promise.all([
        import("../src/plugins/server"),
        import("../src/plugins/async"),
        import("../src/plugins/async/effect"),
        import("../src/service"),
        import("../../runtime/definition/src/plugin"),
        import("../../runtime/definition/src/execution"),
      ]);
    const { os } = await import("@orpc/server");

    expect((os as { readonly effect?: unknown }).effect).toBeUndefined();

    const serverEffect = await import("../src/plugins/server/effect");

    expect(Object.keys(serverEffect)).toEqual([]);
    expect(typeof (os as { readonly effect?: unknown }).effect).toBe("function");

    expect(Object.keys(server).sort()).toEqual([
      "defineServerApiPlugin",
      "defineServerInternalPlugin",
      "implementServerApiPlugin",
      "implementServerInternalPlugin",
      "useService",
    ]);
    expect(Object.keys(asyncPlugin).sort()).toEqual([
      "defineAsyncConsumerPlugin",
      "defineAsyncSchedulePlugin",
      "defineAsyncWorkflowPlugin",
      "defineConsumer",
      "defineSchedule",
      "defineWorkflow",
      "useService",
    ]);
    expect(Object.keys(asyncEffect)).toEqual(["defineAsyncStepEffect"]);

    expect(server.defineServerApiPlugin).toBe(pluginDefinitions.defineServerApiPlugin);
    expect(server.defineServerInternalPlugin).toBe(pluginDefinitions.defineServerInternalPlugin);
    expect(server.implementServerApiPlugin).toBe(pluginDefinitions.implementServerApiPlugin);
    expect(server.implementServerInternalPlugin).toBe(
      pluginDefinitions.implementServerInternalPlugin
    );
    expect(asyncPlugin.defineAsyncWorkflowPlugin).toBe(pluginDefinitions.defineAsyncWorkflowPlugin);
    expect(asyncPlugin.defineAsyncSchedulePlugin).toBe(pluginDefinitions.defineAsyncSchedulePlugin);
    expect(asyncPlugin.defineAsyncConsumerPlugin).toBe(pluginDefinitions.defineAsyncConsumerPlugin);
    expect(asyncPlugin.defineWorkflow).toBe(pluginDefinitions.defineWorkflow);
    expect(asyncPlugin.defineSchedule).toBe(pluginDefinitions.defineSchedule);
    expect(asyncPlugin.defineConsumer).toBe(pluginDefinitions.defineConsumer);
    expect(asyncEffect.defineAsyncStepEffect).toBe(executionDefinitions.defineAsyncStepEffect);
    expect(server.useService).toBe(service.useService);
    expect(asyncPlugin.useService).toBe(service.useService);

    for (const face of [server, serverEffect, asyncPlugin, asyncEffect]) {
      for (const futureSurface of [
        "FunctionBundle",
        "ExecutionDescriptorRef",
        "dispatcher",
        "handlerGen",
        "runPromise",
        "runPromiseExit",
        "Inngest",
        "Elysia",
        "host",
        "loader",
        "adapter",
        "harness",
      ]) {
        expect(face).not.toHaveProperty(futureSurface);
      }

      expect(face).not.toHaveProperty("Effect");
    }

    expect(asyncEffect).not.toHaveProperty("stepEffect");
  });

  test("declares exactly the task 4.2 plugin subpaths without native-host metadata", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as {
      exports: Record<string, unknown>;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const pluginExports = Object.keys(packageJson.exports)
      .filter((subpath) => subpath.startsWith("./plugins/"))
      .sort();
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
    });

    expect(pluginExports).toEqual(expectedPluginExports);
    expect(packageJson.exports["./plugins/server"]).toEqual({
      types: "./dist/plugins/server/index.d.ts",
      import: "./dist/plugins/server/index.js",
      default: "./dist/plugins/server/index.js",
    });
    expect(packageJson.exports["./plugins/server/effect"]).toEqual({
      types: "./dist/plugins/server/effect/index.d.ts",
      import: "./dist/plugins/server/effect/index.js",
      default: "./dist/plugins/server/effect/index.js",
    });
    expect(packageJson.exports["./plugins/async"]).toEqual({
      types: "./dist/plugins/async/index.d.ts",
      import: "./dist/plugins/async/index.js",
      default: "./dist/plugins/async/index.js",
    });
    expect(packageJson.exports["./plugins/async/effect"]).toEqual({
      types: "./dist/plugins/async/effect/index.d.ts",
      import: "./dist/plugins/async/effect/index.js",
      default: "./dist/plugins/async/effect/index.js",
    });
    expect(packageJson.exports).not.toHaveProperty("./plugins/server/mcp");
    expect(packageJson.exports).not.toHaveProperty("./plugins/async/inngest");
    expect(dependencyNames.filter((name) => /elysia|inngest/i.test(name))).toEqual([]);
  });
});
