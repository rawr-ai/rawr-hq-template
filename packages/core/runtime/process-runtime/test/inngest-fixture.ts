import { Inngest } from "inngest";
import { Type } from "typebox";
import { Check } from "typebox/value";

import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import { readRuntimeCompilationAsyncSources } from "../../compiler/src/runtime-compilation-reference-table";
import {
  type AsyncFunctionOptions,
  type AsyncWorkflowDefinition,
  defineApp,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeResource,
  defineWorkflow,
  Effect,
  type RuntimeResource,
  type RuntimeResourceValue,
  type RuntimeSchema,
} from "../../definition/src/index";
import { deriveRuntimeArtifacts } from "../../derivation/src/derive-runtime-artifacts";
import { createInngestWorkflowAdapter } from "../src/adapters/inngest";
import { createInngestFunctionBundle } from "../src/async-function-bundle";
import { createExecutionRegistry } from "../src/execution-registry";
import { createInvocationTracker } from "../src/invocation-tracker";
import { createMountPreparation } from "../src/mount-ready-process";
import type { ProcessRuntimeAccess, RoleRuntimeAccess } from "../src/runtime-access";

/** Real cold producers; labeled access/execution ports do not prove provider acquisition or replay. */
export function createInngestFixture(
  options: {
    readonly ids?: readonly string[];
    readonly run?: AsyncWorkflowDefinition["run"];
    readonly options?: AsyncFunctionOptions;
    readonly client?: Inngest;
  } = {}
) {
  const calls = { body: 0, run: 0, decode: 0, access: 0 };
  const step = defineAsyncStepEffect({
    id: "step",
    policy: {},
    effect: () => {
      calls.body++;
      return Effect.succeed("executed");
    },
  });
  const serializable = Type.Object({ count: Type.Number() });
  const decode: RuntimeSchema<{ count: number }>["decode"] = (input) => {
    calls.decode++;
    return Check(serializable, input)
      ? { success: true, value: input }
      : { success: false, issues: [{ message: "Expected native event count." }] };
  };
  const schema: RuntimeSchema<{ count: number }> = {
    kind: "runtime.schema",
    serializable,
    decode,
    validate: decode,
    toRedactedShape: () => ({ schema: serializable }),
  };
  const app = defineApp({
    id: "inngest-fixture",
    plugins: (options.ids ?? ["workflow"]).map((id, index) =>
      defineAsyncWorkflowPlugin.factory()({
        capability: `work-${index}`,
        services: {},
        workflows: [
          defineWorkflow({
            id,
            eventName: `test/${id}`,
            inputSchema: schema,
            steps: [step],
            options: options.options,
            run(context) {
              calls.run++;
              return options.run?.(context);
            },
          }),
        ],
      })()
    ),
  });
  const profile = defineRuntimeProfile({ id: "test", providers: [], harnesses: ["test-inngest"] });
  const process = defineProcessCatalog({ main: { id: "worker", roles: ["async"] } }).main;
  const entrypoint = defineEntrypoint({
    id: "main",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "main",
      deployment: "test",
      source: "inngest-owner-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  const admission = createInvocationTracker();
  const registry = createExecutionRegistry({
    processId: process.id,
    registryInput: compilation.plan.executionRegistryInput,
    executionPlans: compilation.plan.executionPlans,
    descriptorTable: derivation.executionDescriptorTable,
    assertOpen: (parent) => admission.assertAdmission(parent),
  });
  const execution = {
    execute(): Promise<never> {
      throw new Error("This fixture does not execute managed steps.");
    },
    executeExit(): Promise<never> {
      throw new Error("This fixture does not execute managed steps.");
    },
  };
  const payloads = new Map(
    readRuntimeCompilationAsyncSources(compilation.references).map(([id, source]) => [
      id,
      createInngestFunctionBundle({
        appId: app.id,
        processId: process.id,
        source,
        registry,
        admission,
        execution: { runtime: execution, executeWithin: execution.execute },
      }),
    ])
  );
  const client = options.client ?? new Inngest({ id: "native-fixture", isDev: true });
  const resource = defineRuntimeResource<"test.inngest", Inngest>({
    id: "test.inngest",
    title: "Native client test port",
    purpose: "Native mounting, not acquisition proof",
  });
  const noResources = {
    resource(): never {
      throw new TypeError("No domain resources in this test port.");
    },
    optionalResource: () => undefined,
  };
  const access: ProcessRuntimeAccess = {
    appId: app.id,
    processId: process.id,
    profileId: profile.id,
    entrypointId: entrypoint.id,
    roles: compilation.plan.roles,
    resource<R extends RuntimeResource>(requested: R): RuntimeResourceValue<R> {
      if (requested !== resource) throw new TypeError("Unknown native client test resource.");
      calls.access++;
      return client as RuntimeResourceValue<R>;
    },
    optionalResource: () => undefined,
  };
  const roleAccess: RoleRuntimeAccess = {
    role: "async",
    process: access,
    selectedSurfaces: compilation.plan.surfaces,
    ...noResources,
    forSurface(): never {
      throw new TypeError("The native fixture does not need role access.");
    },
  };
  const prepare = createMountPreparation({
    plan: compilation.plan,
    processAccess: access,
    assertOpen: admission.assertOpen,
    hasSelection: () => true,
    requiresHealth: () => false,
    closeAdmission: () => {
      void admission.closeAndDrain();
    },
    stop: admission.closeAndDrain,
    lower: (surface, adapter) =>
      adapter.lower({
        plan: surface,
        processAccess: access,
        roleAccess,
        serviceBindings: {},
        resources: { has: () => false, get: () => undefined },
        executionRegistry: registry,
        nativeAsync: {
          bundle: () => {
            const payload = payloads.get(surface.surfacePlanId);
            if (payload === undefined) throw new Error("Missing selected fixture payload.");
            return payload;
          },
        },
      }),
  });
  const ready = prepare({
    launchIdentity: entrypoint.identity,
    assignments: compilation.plan.surfaces.map((surface) => ({
      surface,
      adapter: createInngestWorkflowAdapter({ harness: "test-inngest" }),
    })),
  });
  return { client, resource, ready, calls, admission, step, payloads: [...payloads.values()] };
}
