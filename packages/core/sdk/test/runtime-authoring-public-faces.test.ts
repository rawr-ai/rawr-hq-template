import { readFileSync } from "node:fs";

import type { WithEffectContext } from "@orpc/experimental-effect";
import type { Exit } from "effect";
import { describe, expect, test } from "vitest";
import type {
  ProviderBuildContext as PrivateProviderBuildContext,
  RuntimeProvider as PrivateRuntimeProvider,
  RuntimeProviderHealthDescriptor as PrivateRuntimeProviderHealthDescriptor,
  RuntimeResourceMap as PrivateRuntimeResourceMap,
} from "../../runtime/definition/src/provider";
import type {
  ProviderAcquire as PrivateProviderAcquire,
  ProviderEffectPlan as PrivateProviderEffectPlan,
  ProviderFx as PrivateProviderFx,
  ProviderFxFacade as PrivateProviderFxFacade,
  ProviderRelease as PrivateProviderRelease,
} from "../../runtime/definition/src/provider-effect-plan";
import type { EffectContext } from "../src/effect/context";
import type { EffectWrap } from "../src/effect/wrap";
import type {
  BoundaryTelemetry,
  EffectBoundaryContext,
  EffectExecutionExit,
  ProcedureExecutionContext,
} from "../src/execution";
import type {
  ServiceContractOf as AsyncServiceContractOf,
  ServiceUses as AsyncServiceUses,
} from "../src/plugins/async";
import type {
  ServiceContractOf as ServerServiceContractOf,
  ServiceUses as ServerServiceUses,
} from "../src/plugins/server";
import type {
  WebAppPluginBuilder,
  WebAppPluginDefinition,
  WebAppPluginInput,
  WebRouteProjection,
} from "../src/plugins/web";
import type {
  ProviderBuildContext,
  RuntimeProvider,
  RuntimeProviderHealthDescriptor,
  RuntimeResourceMap,
} from "../src/runtime/providers";
import type {
  ProviderAcquire,
  ProviderEffectPlan,
  ProviderFx,
  ProviderFxFacade,
  ProviderRelease,
} from "../src/runtime/providers/effect";
import type { RuntimeResource, RuntimeResourceValue } from "../src/runtime/resources";
import type { ServiceContractOf, ServiceUses } from "../src/service";

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

const expectedRuntimeExports = [
  "./app",
  "./effect",
  "./effect/context",
  "./effect/wrap",
  "./execution",
  "./runtime/derivation",
  "./runtime/harnesses",
  "./runtime/harnesses/elysia",
  "./runtime/harnesses/inngest",
  "./runtime/harnesses/web",
  "./runtime/observation",
  "./runtime/profiles",
  "./runtime/providers",
  "./runtime/providers/effect",
  "./runtime/resources",
  "./runtime/schema",
];

type ProviderTestResource = RuntimeResource<"sdk.provider-test", { readonly ready: true }>;

const providerTypeIdentityOracle: readonly [
  TypesEqual<ProviderBuildContext<undefined>, PrivateProviderBuildContext<undefined>>,
  TypesEqual<
    RuntimeProvider<ProviderTestResource, undefined, never>,
    PrivateRuntimeProvider<ProviderTestResource, undefined, never>
  >,
  TypesEqual<RuntimeProviderHealthDescriptor, PrivateRuntimeProviderHealthDescriptor>,
  TypesEqual<RuntimeResourceMap, PrivateRuntimeResourceMap>,
  TypesEqual<
    ProviderAcquire<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>,
    PrivateProviderAcquire<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>
  >,
  TypesEqual<
    ProviderEffectPlan<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>,
    PrivateProviderEffectPlan<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>
  >,
  TypesEqual<
    ProviderFx<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>,
    PrivateProviderFx<{ readonly ready: true }, { readonly _tag: "AcquireFailure" }>
  >,
  TypesEqual<ProviderFxFacade, PrivateProviderFxFacade>,
  TypesEqual<
    ProviderRelease<{ readonly ready: true }>,
    PrivateProviderRelease<{ readonly ready: true }>
  >,
] = [true, true, true, true, true, true, true, true, true];

const expectedDerivationRuntimeExports = [
  "PortableRuntimePlanArtifactSchema",
  "decodePortableRuntimePlanArtifact",
  "deriveRuntimeArtifacts",
] as const;

const expectedPluginExports = [
  "./plugins/agent",
  "./plugins/agent/effect",
  "./plugins/agent/schema",
  "./plugins/async",
  "./plugins/async/effect",
  "./plugins/cli",
  "./plugins/cli/effect",
  "./plugins/cli/oclif",
  "./plugins/cli/schema",
  "./plugins/desktop",
  "./plugins/desktop/effect",
  "./plugins/server",
  "./plugins/server/effect",
  "./plugins/web",
  "./plugins/web/effect",
];

describe("runtime authoring public faces", () => {
  test("keeps native CLI authoring cold and retires global workspace acquisition", async () => {
    expect(Object.keys(await import("../src/index"))).toEqual([]);
    expect(Object.keys(await import("../src/plugins/cli")).sort()).toEqual([
      "defineCliTopicPlugin",
      "useService",
    ]);
    expect(Object.keys(await import("../src/plugins/cli/effect"))).toEqual(["defineCommand"]);
    expect(Object.keys(await import("../src/plugins/cli/schema"))).toEqual(["cliSchema"]);
    expect(Object.keys(await import("../src/plugins/cli/oclif")).sort()).toEqual([
      "createOclifCommand",
      "readOclifCommandSource",
    ]);
  });
  test("imports the companion harness contract without live values", async () => {
    expect(Object.keys(await import("../src/runtime/harnesses"))).toEqual([]);
    expect(Object.keys(await import("../src/runtime/observation"))).toEqual([]);
  });

  test("projects only the cold Elysia descriptor factory on its explicit companion face", async () => {
    const face = await import("../src/runtime/harnesses/elysia");
    expect(Object.keys(face)).toEqual(["createElysiaHarness"]);
    const descriptor = face.createElysiaHarness({
      id: "native",
      hostname: "127.0.0.1",
      port: 0,
      publicDocument: { path: "/openapi.json", info: { title: "Cold", version: "1" } },
    });
    expect(descriptor.id).toBe("native");
    expect(descriptor.surfaces).toEqual(["server/api", "server/internal"]);
  });
  test("projects only a cold Inngest companion with an existing native client resource", async () => {
    const face = await import("../src/runtime/harnesses/inngest");
    const resources = await import("../src/runtime/resources");
    expect(Object.keys(face)).toEqual(["createInngestHarness"]);
    const client = resources.defineRuntimeResource<"client", import("inngest").Inngest>({
      id: "client",
      title: "Client",
      purpose: "Native host",
    });
    const descriptor = face.createInngestHarness({ id: "native", client, mode: "connect" });
    expect(descriptor.id).toBe("native");
    expect(descriptor.roles).toEqual(["async"]);
    expect(descriptor.surfaces).toEqual(["async/workflow", "async/schedule", "async/consumer"]);
  });
  test("projects the exact cold tool/background authoring families without native hosts", async () => {
    const agent = await import("../src/plugins/agent");
    const agentEffect = await import("../src/plugins/agent/effect");
    const agentSchema = await import("../src/plugins/agent/schema");
    const desktop = await import("../src/plugins/desktop");
    const desktopEffect = await import("../src/plugins/desktop/effect");
    const definitions = await import("../../runtime/definition/src/index");
    const { Type } = await import("typebox");
    expect(Object.keys(agent).sort()).toEqual(["defineAgentToolPlugin", "useService"]);
    expect(Object.keys(agentEffect)).toEqual(["defineTool"]);
    expect(Object.keys(agentSchema)).toEqual(["toolSchema"]);
    expect(Object.keys(desktop).sort()).toEqual(["defineDesktopBackgroundPlugin", "useService"]);
    expect(Object.keys(desktopEffect)).toEqual(["defineDesktopBackground"]);
    expect(agent.defineAgentToolPlugin).toBe(definitions.defineAgentToolPlugin);
    expect(agentEffect.defineTool).toBe(definitions.defineTool);
    expect(desktop.defineDesktopBackgroundPlugin).toBe(definitions.defineDesktopBackgroundPlugin);
    expect(desktopEffect.defineDesktopBackground).toBe(definitions.defineDesktopBackground);
    expect(agentSchema.toolSchema.object).toBe(Type.Object);
    expect(agentSchema.toolSchema.string).toBe(Type.String);
    expect(agentSchema.toolSchema.optional).toBe(Type.Optional);
    for (const face of [agent, agentEffect, agentSchema, desktop, desktopEffect]) {
      for (const excluded of [
        "Effect",
        "ManagedRuntime",
        "runPromise",
        "startApp",
        "host",
        "shell",
        "mount",
        "adapter",
        "attachExecutionProjection",
      ])
        expect(face).not.toHaveProperty(excluded);
    }
  });
  test("cold-imports only the admitted runtime authoring operations", async () => {
    const [
      app,
      effect,
      effectContext,
      effectWrap,
      execution,
      profiles,
      providerEffect,
      providers,
      resources,
      runtimeSchema,
      service,
    ] = await Promise.all([
      import("../src/app"),
      import("../src/effect"),
      import("../src/effect/context"),
      import("../src/effect/wrap"),
      import("../src/execution"),
      import("../src/runtime/profiles"),
      import("../src/runtime/providers/effect"),
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
      "startApp",
    ]);
    expect(Object.keys(effect).sort()).toEqual(["Effect", "TaggedError"]);
    expect(Object.keys(effectContext)).toEqual([]);
    expect(Object.keys(effectWrap)).toEqual([]);
    expect(Object.keys(execution)).toEqual([]);
    expect(Object.keys(profiles).sort()).toEqual(["defineRuntimeProfile", "providerSelection"]);
    expect(Object.keys(providerEffect)).toEqual(["providerFx"]);
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
      "sealService",
      "semanticDep",
      "serviceDep",
      "useService",
    ]);

    for (const face of [app, effect, execution, profiles, providers, resources, runtimeSchema]) {
      if (face !== app) expect(face).not.toHaveProperty("startApp");
      expect(face).not.toHaveProperty("ProviderEffectPlan");
      expect(face).not.toHaveProperty("providerFx");
      expect(face).not.toHaveProperty("build");
      expect(face).not.toHaveProperty("ManagedRuntime");
      expect(face).not.toHaveProperty("runPromise");
    }
    for (const excludedProviderSurface of [
      "Effect",
      "Exit",
      "Layer",
      "ManagedRuntime",
      "ProviderScope",
      "Scope",
      "acquireRelease",
      "readProviderEffectPlan",
      "runPromiseExit",
    ]) {
      expect(providers).not.toHaveProperty(excludedProviderSurface);
      expect(providerEffect).not.toHaveProperty(excludedProviderSurface);
    }
    expect(providerEffect).not.toHaveProperty("defineRuntimeProvider");
    expect(providers).not.toHaveProperty("providerFx");
    for (const face of [app, effect, execution, providers, resources, runtimeSchema]) {
      expect(face).not.toHaveProperty("providerSelection");
    }
  });

  test("preserves the exact admitted runtime package subpaths", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { exports: Record<string, unknown> };
    const runtimeExports = Object.keys(packageJson.exports)
      .filter(
        (subpath) =>
          ["./app", "./effect", "./execution"].includes(subpath) ||
          subpath.startsWith("./effect/") ||
          subpath.startsWith("./runtime/")
      )
      .sort();

    expect(runtimeExports).toEqual(expectedRuntimeExports);
    expect(packageJson.exports["./runtime/providers/effect"]).toEqual({
      types: "./dist/runtime/providers/effect/index.d.ts",
      import: "./dist/runtime/providers/effect/index.js",
      default: "./dist/runtime/providers/effect/index.js",
    });
    expect(packageJson.exports["./runtime/harnesses"]).toEqual({
      types: "./dist/runtime/harnesses/index.d.ts",
      import: "./dist/runtime/harnesses/index.js",
      default: "./dist/runtime/harnesses/index.js",
    });
    expect(packageJson.exports["./runtime/observation"]).toEqual({
      types: "./dist/runtime/observation/index.d.ts",
      import: "./dist/runtime/observation/index.js",
      default: "./dist/runtime/observation/index.js",
    });
  });

  test("projects native context and wrap slots with inert execution contracts", () => {
    const identity: readonly [
      TypesEqual<EffectContext<never>, WithEffectContext<never>["effect/context"]>,
      TypesEqual<EffectWrap, NonNullable<WithEffectContext<never>["effect/wrap"]>>,
      TypesEqual<EffectExecutionExit<string, Error>, Exit.Exit<string, Error>>,
      TypesEqual<
        ProcedureExecutionContext<string, { readonly trace: string }>,
        {
          readonly input: string;
          readonly context: { readonly trace: string };
          readonly execution: EffectBoundaryContext;
          readonly telemetry: BoundaryTelemetry;
        }
      >,
    ] = [true, true, true, true];
    expect(identity).toEqual([true, true, true, true]);
  });

  test("projects the exact cold provider authoring faces by implementation identity", async () => {
    const [providerFace, providerEffectFace, privateProvider, privateProviderEffect, resources] =
      await Promise.all([
        import("../src/runtime/providers"),
        import("../src/runtime/providers/effect"),
        import("../../runtime/definition/src/provider"),
        import("../../runtime/definition/src/provider-effect-plan"),
        import("../src/runtime/resources"),
      ]);
    let acquireCalls = 0;
    let buildCalls = 0;
    let releaseCalls = 0;
    const resource = resources.defineRuntimeResource<"sdk.provider-test", { readonly ready: true }>(
      {
        id: "sdk.provider-test",
        title: "SDK provider test",
        purpose: "Prove cold provider authoring through both public faces.",
      }
    );
    const provider = providerFace.defineRuntimeProvider({
      id: "sdk.provider-test",
      title: "SDK provider test",
      provides: resource,
      requires: [],
      build: () => {
        buildCalls += 1;
        return providerEffectFace.providerFx.acquireRelease({
          acquire: providerEffectFace.providerFx.tryPromise({
            try: () => {
              acquireCalls += 1;
              return { ready: true as const };
            },
            catch: () => ({ _tag: "AcquireFailure" as const }),
          }),
          release: () => {
            releaseCalls += 1;
            return providerEffectFace.providerFx.succeed(undefined);
          },
        });
      },
    });
    const providedValue: RuntimeResourceValue<typeof resource> = {
      ready: true,
    };

    expect(providerFace.defineRuntimeProvider).toBe(privateProvider.defineRuntimeProvider);
    expect(providerEffectFace.providerFx).toBe(privateProviderEffect.providerFx);
    expect(provider.kind).toBe("runtime.provider");
    expect(provider.build).toBeTypeOf("function");
    expect(providedValue).toEqual({ ready: true });
    expect(providerTypeIdentityOracle).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect({ acquireCalls, buildCalls, releaseCalls }).toEqual({
      acquireCalls: 0,
      buildCalls: 0,
      releaseCalls: 0,
    });
  });

  test("projects the exact complete derivation public face", async () => {
    const [publicDerivation, privateDerivation] = await Promise.all([
      import("../src/runtime/derivation"),
      import("../../runtime/derivation/src/index"),
    ]);
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { exports: Record<string, unknown> };
    expect(Object.keys(publicDerivation).sort()).toEqual(expectedDerivationRuntimeExports);
    expect(packageJson.exports["./runtime/derivation"]).toEqual({
      types: "./dist/runtime/derivation/index.d.ts",
      import: "./dist/runtime/derivation/index.js",
      default: "./dist/runtime/derivation/index.js",
    });
    expect(publicDerivation.deriveRuntimeArtifacts).toBe(privateDerivation.deriveRuntimeArtifacts);
    expect(publicDerivation.PortableRuntimePlanArtifactSchema).toBe(
      privateDerivation.PortableRuntimePlanArtifactSchema
    );
    expect(publicDerivation.decodePortableRuntimePlanArtifact).toBe(
      privateDerivation.decodePortableRuntimePlanArtifact
    );
  });

  test("derives an admitted async occurrence and lazy web loader through the SDK", async () => {
    const [
      appFace,
      asyncFace,
      asyncEffectFace,
      derivation,
      effectFace,
      profileFace,
      schemaFace,
      web,
    ] = await Promise.all([
      import("../src/app"),
      import("../src/plugins/async"),
      import("../src/plugins/async/effect"),
      import("../src/runtime/derivation"),
      import("../src/effect"),
      import("../src/runtime/profiles"),
      import("../src/runtime/schema"),
      import("../src/plugins/web"),
    ]);
    const { Type } = await import("typebox");
    let effectCalls = 0;
    let loaderCalls = 0;
    const authoredStep = asyncEffectFace.defineAsyncStepEffect({
      id: "deliver",
      policy: {},
      effect: () => {
        effectCalls += 1;
        return effectFace.Effect.succeed("delivered");
      },
    });
    const workflow = asyncFace.defineWorkflow({
      id: "delivery",
      eventName: "delivery/requested",
      inputSchema: schemaFace.RuntimeSchema.fromTypeBox(Type.Object({ id: Type.String() })),
      steps: [authoredStep],
      run: () => undefined,
    });
    const asyncPlugin = asyncFace.defineAsyncWorkflowPlugin.factory()({
      capability: "delivery",
      services: {},
      workflows: [workflow],
    })();
    const loadRouteModule = async () => {
      loaderCalls += 1;
      return { page: "delivery" } as const;
    };
    const webPlugin = web.defineWebAppPlugin.factory()({
      capability: "delivery",
      routes: [{ id: "delivery.index", path: "/delivery", module: loadRouteModule }],
    })();
    const app = appFace.defineApp({
      id: "sdk-acceptance",
      plugins: [asyncPlugin, webPlugin],
    });
    const process = appFace.defineProcessCatalog({
      application: { id: "application", roles: ["async", "web"] },
    }).application;
    const profile = profileFace.defineRuntimeProfile({
      id: "acceptance",
      providers: [],
    });
    const entrypoint = appFace.defineEntrypoint({
      id: "acceptance",
      app,
      profile,
      process,
      identity: {
        app: "sdk-acceptance",
        process: "application",
        entrypoint: "acceptance",
        deployment: "test",
        source: "sdk-public-face",
      },
    });

    const result = derivation.deriveRuntimeArtifacts({
      entrypoint,
      profileId: "acceptance",
    });
    const executionEntries = result.executionDescriptorTable.entries();
    const webEntries = result.webRouteModuleTable.entries();

    expect(Object.keys(result).sort()).toEqual([
      "cliCommandSources",
      "executionDescriptorTable",
      "graph",
      "portableArtifact",
      "topology",
      "webRouteModuleTable",
    ]);
    expect(result.graph.topology).toBe(result.topology);
    expect(executionEntries).toHaveLength(1);
    expect(executionEntries[0]?.[0]).toMatchObject({
      boundary: "plugin.async-step",
    });
    expect(result.executionDescriptorTable.get(executionEntries[0]![0])).toBe(
      executionEntries[0]![1]
    );
    expect(webEntries).toHaveLength(1);
    expect(result.webRouteModuleTable.get(webEntries[0]!.ref)).toBe(loadRouteModule);
    expect(effectCalls).toBe(0);
    expect(loaderCalls).toBe(0);
  });

  test("cold-imports only the admitted server and async authoring operations", async () => {
    const [
      server,
      asyncPlugin,
      asyncEffect,
      service,
      pluginDefinitions,
      executionDefinitions,
      asyncDefinitions,
    ] = await Promise.all([
      import("../src/plugins/server"),
      import("../src/plugins/async"),
      import("../src/plugins/async/effect"),
      import("../src/service"),
      import("../../runtime/definition/src/plugin"),
      import("../../runtime/definition/src/execution"),
      import("../../runtime/definition/src/async-plugin"),
    ]);
    const { implement, os } = await import("@orpc/server");

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
      "useWorkflowDispatcher",
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
    expect(Object.keys(asyncEffect).sort()).toEqual(["defineAsyncStepEffect", "stepEffect"]);

    expect(server.defineServerApiPlugin).toBe(pluginDefinitions.defineServerApiPlugin);
    expect(server.defineServerInternalPlugin).toBe(pluginDefinitions.defineServerInternalPlugin);
    expect(server.implementServerApiPlugin).toBe(implement);
    expect(server.implementServerInternalPlugin).toBe(implement);
    expect(asyncPlugin.defineAsyncWorkflowPlugin).toBe(asyncDefinitions.defineAsyncWorkflowPlugin);
    expect(asyncPlugin.defineAsyncSchedulePlugin).toBe(asyncDefinitions.defineAsyncSchedulePlugin);
    expect(asyncPlugin.defineAsyncConsumerPlugin).toBe(asyncDefinitions.defineAsyncConsumerPlugin);
    expect(asyncPlugin.defineWorkflow).toBe(asyncDefinitions.defineWorkflow);
    expect(asyncPlugin.defineSchedule).toBe(asyncDefinitions.defineSchedule);
    expect(asyncPlugin.defineConsumer).toBe(asyncDefinitions.defineConsumer);
    expect(asyncEffect.defineAsyncStepEffect).toBe(executionDefinitions.defineAsyncStepEffect);
    expect(server.useService).toBe(service.useService);
    expect(asyncPlugin.useService).toBe(service.useService);

    const serviceDefinition = service.defineService({
      id: "work-items",
      deps: {},
    });
    const contract = serviceDefinition.oc.router({
      read: serviceDefinition.oc,
    });
    const serviceExport = service.sealService(serviceDefinition, {
      contract,
      construct: () => {
        throw new Error("Cold constructor executed");
      },
    });
    const serviceUse = server.useService(serviceExport);
    const selectedServiceUse = asyncPlugin.useService(serviceExport, {
      instance: "secondary",
    });
    const services = { workItems: serviceUse } as const satisfies ServiceUses;
    const serverServices = services satisfies ServerServiceUses;
    const asyncServices = services satisfies AsyncServiceUses;
    const contractIsExact: TypesEqual<
      ServiceContractOf<(typeof services)["workItems"]>,
      typeof contract
    > = true;
    const serverContractIsExact: TypesEqual<
      ServerServiceContractOf<(typeof serverServices)["workItems"]>,
      typeof contract
    > = true;
    const asyncContractIsExact: TypesEqual<
      AsyncServiceContractOf<(typeof asyncServices)["workItems"]>,
      typeof contract
    > = true;
    const serviceKeyIsExact: TypesEqual<keyof typeof services, "workItems"> = true;

    expect(Object.keys(serviceUse)).toEqual(["kind", "serviceId"]);
    expect(JSON.parse(JSON.stringify(serviceUse))).toEqual({
      kind: "service.use",
      serviceId: "work-items",
    });
    expect(Object.keys(selectedServiceUse)).toEqual(["kind", "serviceId", "serviceInstance"]);
    expect(selectedServiceUse.serviceInstance).toBe("secondary");
    expect(Object.isFrozen(serviceUse)).toBe(true);
    expect(Object.isFrozen(selectedServiceUse)).toBe(true);
    expect(contractIsExact).toBe(true);
    expect(serverContractIsExact).toBe(true);
    expect(asyncContractIsExact).toBe(true);
    expect(serviceKeyIsExact).toBe(true);

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

    expect(typeof asyncEffect.stepEffect).toBe("function");
  });

  test("cold-imports only the task 4.6 web authoring operation", async () => {
    const [web, pluginDefinitions] = await Promise.all([
      import("../src/plugins/web"),
      import("../../runtime/definition/src/plugin"),
    ]);
    let moduleLoads = 0;
    const route: WebRouteProjection<{ readonly render: "work-items" }> = {
      id: "work-items.index",
      path: "/work-items",
      module: async () => {
        moduleLoads += 1;
        return { render: "work-items" };
      },
    };
    const input = {
      capability: "work-items",
      routes: [route] as const,
    } satisfies WebAppPluginInput<"work-items", readonly [typeof route]>;
    const builder: WebAppPluginBuilder = web.defineWebAppPlugin;
    const definition: WebAppPluginDefinition<"work-items", readonly [typeof route]> =
      builder.factory()(input)();

    expect(Object.keys(web)).toEqual(["defineWebAppPlugin"]);
    expect(web.defineWebAppPlugin).toBe(pluginDefinitions.defineWebAppPlugin);
    expect(definition).toMatchObject({
      id: "web.app.work-items",
      role: "web",
      surface: "web/app",
    });
    expect(moduleLoads).toBe(0);

    for (const excludedSurface of [
      "useService",
      "host",
      "router",
      "mount",
      "build",
      "adapter",
      "harness",
      "Effect",
      "React",
      "Vite",
    ]) {
      expect(web).not.toHaveProperty(excludedSurface);
    }
  });

  test("keeps plugin subpaths closed and admits only the explicit optional native peers", async () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as {
      exports: Record<string, unknown>;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
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
    expect(packageJson.exports["./plugins/web"]).toEqual({
      types: "./dist/plugins/web/index.d.ts",
      import: "./dist/plugins/web/index.js",
      default: "./dist/plugins/web/index.js",
    });
    expect(packageJson.exports).not.toHaveProperty("./plugins/server/mcp");
    expect(packageJson.exports).not.toHaveProperty("./plugins/async/inngest");
    expect(packageJson.exports["./plugins/web/effect"]).toEqual({
      types: "./dist/plugins/web/effect/index.d.ts",
      import: "./dist/plugins/web/effect/index.js",
      default: "./dist/plugins/web/effect/index.js",
    });
    expect(Object.keys(await import("../src/plugins/web/effect"))).toEqual(["defineWebEffect"]);
    expect(Object.keys(await import("../src/runtime/harnesses/web"))).toEqual([
      "createBunWebHarness",
    ]);
    expect(dependencyNames.filter((name) => /elysia|inngest/i.test(name)).sort()).toEqual([
      "elysia",
      "inngest",
    ]);
    expect(packageJson.peerDependencies?.elysia).toBe("1.4.30");
    expect(packageJson.peerDependenciesMeta?.elysia).toEqual({ optional: true });
    expect(packageJson.peerDependencies?.inngest).toBe("4.18.0");
    expect(packageJson.peerDependenciesMeta?.inngest).toEqual({ optional: true });
    expect(packageJson.dependencies ?? {}).not.toHaveProperty("elysia");
    expect(packageJson.optionalDependencies ?? {}).not.toHaveProperty("elysia");
    expect(packageJson.dependencies ?? {}).not.toHaveProperty("inngest");
    expect(packageJson.optionalDependencies ?? {}).not.toHaveProperty("inngest");
  });
});
