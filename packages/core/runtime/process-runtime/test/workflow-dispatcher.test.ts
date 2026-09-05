import { expect, test } from "bun:test";
import "@orpc/experimental-effect/extensions/effect";
import { createProcedureClient, os } from "@orpc/server";
import { isAsyncIteratorObject } from "@orpc/shared";
import { Effect } from "effect";
import { Inngest, Middleware } from "inngest";

import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import { readRuntimeCompilationWorkflowAdmissions } from "../../compiler/src/runtime-compilation-reference-table";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "../../definition/src/app";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "../../definition/src/async-plugin";
import { defineServerApiPlugin, type ServerPluginContext } from "../../definition/src/plugin";
import { defineRuntimeProfile, providerSelection } from "../../definition/src/profile";
import { defineRuntimeProvider } from "../../definition/src/provider";
import { providerFx } from "../../definition/src/provider-effect-plan";
import { defineRuntimeResource, requireResource } from "../../definition/src/resource";
import type { RuntimeSchema } from "../../definition/src/schema";
import type { ServiceUses } from "../../definition/src/service";
import type { WorkflowAdmissionDefinition } from "../../definition/src/workflow-admission";
import {
  useWorkflowDispatcher,
  type WorkflowDispatcherUses,
} from "../../definition/src/workflow-dispatcher-use";
import { deriveRuntimeArtifacts } from "../../derivation/src/derive-runtime-artifacts";
import { provisionProcess } from "../../substrate/effect/src/provision-process";
import { createProcessRuntime } from "../src/create-process-runtime";

type Payload = { key: string; at: Date };
type Workflow = WorkflowAdmissionDefinition<string, Payload>;
type RequestContext = ServerPluginContext<ServiceUses, WorkflowDispatcherUses>;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Real client/send transport; the receiver is an acknowledgement port, not a workflow engine. */
async function fixture(input: {
  readonly middleware?: readonly Middleware.Class[];
  readonly secondClient?: boolean;
  readonly run?: (context: RequestContext, workflow: Workflow, other: Workflow) => unknown;
  readonly effect?: (
    context: RequestContext,
    workflow: Workflow
  ) => Effect.Effect<unknown, unknown>;
}) {
  const calls = { build: 0, acquire: 0, release: 0, validate: 0, decode: 0, run: 0 };
  const events: string[] = [];
  const wire: unknown[] = [];
  const nativeInputs: { client: Inngest.Any; data: unknown; id: string | undefined }[] = [];
  const acquired: Inngest[] = [];
  let captured: RequestContext | undefined;
  const receiver = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      wire.push(await request.json());
      return Response.json({ status: 200, ids: [`native-event-${wire.length}`] });
    },
  });
  class Capture extends Middleware.BaseMiddleware {
    readonly id = "capture-original-send";
    async wrapSendEvent({ events, next }: Middleware.WrapSendEventArgs) {
      for (const event of events)
        nativeInputs.push({ client: this.client, data: event.data, id: event.id });
      return next();
    }
  }
  const schema: RuntimeSchema<Payload> = {
    kind: "runtime.schema",
    serializable: { type: "object" },
    decode() {
      calls.decode++;
      throw new Error("Admission must not decode an already-decoded payload.");
    },
    validate(value) {
      calls.validate++;
      if (
        typeof value !== "object" ||
        value === null ||
        !("key" in value) ||
        typeof value.key !== "string" ||
        value.key.length === 0 ||
        !("at" in value) ||
        !(value.at instanceof Date)
      )
        return { success: false, issues: [{ message: "Expected a decoded workflow payload." }] };
      // Validation is a gate, not a replacement-value or second decoding boundary.
      return { success: true, value: { key: "validator-replacement", at: value.at } };
    },
    toRedactedShape: () => ({ schema: { type: "object" } }),
  };
  const workflow = defineWorkflow({
    id: "sync",
    eventName: "admission/sync",
    inputSchema: schema,
    steps: [],
    run() {
      calls.run++;
      return null;
    },
  });
  const other = defineWorkflow({
    id: "other",
    eventName: "admission/other",
    inputSchema: schema,
    steps: [],
    run: () => null,
  });
  const missingExecutionResource = defineRuntimeResource({
    id: "execution-only",
    title: "Execution only",
    purpose: "Admission must not acquire the target's resources.",
  });
  const target = defineAsyncWorkflowPlugin.factory()({
    capability: "dispatch-target",
    services: {},
    workflows: [workflow, other],
    resourceRequirements: [
      requireResource({ resource: missingExecutionResource, reason: "Execution only" }),
    ],
  })();
  const resource = defineRuntimeResource<"event-client", Inngest>({
    id: "event-client",
    title: "Native event client",
    purpose: "Workflow admission transport",
  });
  const requirement = requireResource({ resource, instance: "first", reason: "First client" });
  const secondRequirement = input.secondClient
    ? requireResource({ resource, instance: "second", reason: "Second client" })
    : requirement;
  const provider = defineRuntimeProvider({
    id: "native-event-client",
    title: "Native event client",
    provides: resource,
    requires: [],
    build() {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          const client = new Inngest({
            id: `admission-client-${calls.acquire}`,
            isDev: true,
            baseUrl: receiver.url.origin,
            middleware: [Capture, ...(input.middleware ?? [])],
          });
          acquired.push(client);
          return client;
        }),
        release: () =>
          Effect.sync(() => {
            calls.release++;
            events.push("provider-released");
          }),
      });
    },
  });
  const uses = {
    first: useWorkflowDispatcher(target, { workflows: [workflow], client: requirement }),
    second: useWorkflowDispatcher(target, { workflows: [workflow], client: secondRequirement }),
    other: useWorkflowDispatcher(target, { workflows: [other], client: requirement }),
  };
  const native = os.$context<RequestContext>();
  const procedure =
    input.effect === undefined
      ? native.handler(({ context }) => {
          captured = context;
          return input.run?.(context, workflow, other);
        })
      : native.effect(function* ({ context }) {
          captured = context;
          return yield* input.effect!(context, workflow);
        });
  const plugin = defineServerApiPlugin.factory()({
    capability: "workflow-admission",
    services: {},
    workflows: uses,
    routeBase: "/api",
    api: () => ({ invoke: procedure }),
  })();
  const app = defineApp({ id: "workflow-admission", plugins: [plugin, target] });
  const profile = defineRuntimeProfile({
    id: "test",
    providers: [
      providerSelection({ resource, provider, instance: "first" }),
      ...(input.secondClient
        ? [providerSelection({ resource, provider, instance: "second" })]
        : []),
    ],
  });
  const process = defineProcessCatalog({ server: { id: "server", roles: ["server"] } }).server;
  const entrypoint = defineEntrypoint({
    id: "server",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "server",
      deployment: "test",
      source: "native-admission-owner-proof",
    },
  });
  let stop = () => Promise.resolve();
  try {
    const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
    const compilation = compileRuntimePlan({ derivation });
    expect(calls).toEqual({ build: 0, acquire: 0, release: 0, validate: 0, decode: 0, run: 0 });
    expect(compilation.plan.roles).toEqual(["server"]);
    expect(compilation.plan.surfaces.map((surface) => surface.surface)).toEqual(["server/api"]);
    expect(compilation.plan.executionPlans).toEqual([]);
    expect(compilation.plan.harnesses).toEqual([]);
    expect(compilation.plan.bootgraphInput.edges).toEqual([]);
    // Independent resources have a fixed ordered DTO; ordering itself is not this owner's proof.
    const modules = compilation.plan.bootgraphInput.nodes.map((node) => ({
      kind: "boot.resource-module" as const,
      key: {
        kind: "boot.resource-key" as const,
        selectionId: node.selectionId,
        resourceId: node.resource.resourceId,
        lifetime: node.resource.lifetime,
        ...(node.resource.role === undefined ? {} : { role: node.resource.role }),
        ...(node.resource.instance === undefined ? {} : { instance: node.resource.instance }),
      },
      providerId: node.providerId,
      dependencies: [],
    }));
    const order = modules.map((module) => module.key);
    const provisioned = await provisionProcess({
      compilation,
      bootgraph: {
        kind: "bootgraph.ordered",
        modules,
        order,
        releaseOrder: [...order].reverse(),
        rollbackOrder: [...order].reverse(),
      },
      sources: { appRoot: import.meta.dir },
    });
    stop = () => provisioned.managedRuntime.dispose();
    const runtime = await createProcessRuntime({
      compilation,
      provisioned,
      descriptorTable: derivation.executionDescriptorTable,
    });
    stop = runtime.stop;
    const requests = runtime.lower(compilation.plan.surfaces[0]!, {
      role: "server",
      surface: "server/api",
      harness: "owner-test",
      lower(input) {
        if (input.nativeServer === undefined) throw new Error("Expected native request assembly.");
        return {
          payload: input.nativeServer.requests,
          payloadSchemas: [],
          findings: [],
          observations: [],
        };
      },
    }).payload;
    return {
      calls,
      events,
      wire,
      nativeInputs,
      acquired,
      workflow,
      other,
      compilation,
      runtime,
      context: () => captured!,
      invoke: (signal?: AbortSignal) =>
        createProcedureClient(procedure, {
          context: requests.context(new Request("http://local/api/invoke")),
          interceptors: requests.clientInterceptors,
        })(undefined, { signal }),
      async close() {
        try {
          await stop();
        } finally {
          await receiver.stop(true);
        }
      },
    };
  } catch (error) {
    try {
      await stop();
    } finally {
      await receiver.stop(true);
    }
    throw error;
  }
}

test("server-only admission retains exact groups, original decoded payload and native event IDs", async () => {
  const payload = { key: "original", at: new Date("2026-09-05T12:00:00.000Z") };
  let invalid = false;
  const proof = await fixture({
    async run(context, workflow, other) {
      expect(Object.isFrozen(context.workflows)).toBe(true);
      expect(Object.isFrozen(context.workflows.first)).toBe(true);
      await expect(context.workflows.first!.send({ ...workflow }, payload)).rejects.toThrow(
        "outside this named dispatcher"
      );
      await expect(context.workflows.first!.send(other, payload)).rejects.toThrow(
        "outside this named dispatcher"
      );
      await expect(context.workflows.other!.send(workflow, payload)).rejects.toThrow(
        "outside this named dispatcher"
      );
      return context.workflows.first!.send(workflow, invalid ? { ...payload, key: "" } : payload, {
        id: "outbox-17",
      });
    },
  });
  try {
    const result = await proof.invoke();
    expect(result).toEqual({ eventIds: ["native-event-1"] });
    expect(Object.isFrozen(result)).toBe(true);
    if (typeof result !== "object" || result === null || !("eventIds" in result))
      throw new Error("Expected native event IDs.");
    expect(Object.isFrozen(result.eventIds)).toBe(true);
    expect(proof.nativeInputs[0]).toEqual({
      client: proof.acquired[0],
      data: payload,
      id: "outbox-17",
    });
    expect(proof.nativeInputs[0]!.data).toBe(payload);
    expect(proof.wire).toMatchObject([
      [
        {
          name: "admission/sync",
          id: "outbox-17",
          data: {
            key: "original",
            at: payload.at.toISOString(),
          },
        },
      ],
    ]);
    expect(proof.calls).toEqual({
      build: 1,
      acquire: 1,
      release: 0,
      validate: 1,
      decode: 0,
      run: 0,
    });
    await expect(proof.context().workflows.first!.send(proof.workflow, payload)).rejects.toThrow(
      "expired"
    );
    invalid = true;
    await expect(proof.invoke()).rejects.toThrow("Workflow payload failed its owning schema.");
    expect(proof.wire).toHaveLength(1);
    expect(proof.calls.validate).toBe(2);
    expect(proof.calls.decode).toBe(0);
  } finally {
    await proof.close();
  }
  expect(proof.calls.release).toBe(1);
});

test("dispatch reads a structural inherited event ID once and forwards it unchanged", async () => {
  let reads = 0;
  class Options {
    get id() {
      reads++;
      return "outbox-source-17";
    }
  }
  const proof = await fixture({
    run(context, workflow) {
      return context.workflows.first!.send(
        workflow,
        { key: "structural-options", at: new Date() },
        new Options()
      );
    },
  });
  try {
    expect(await proof.invoke()).toEqual({ eventIds: ["native-event-1"] });
    expect(reads).toBe(1);
    expect(proof.nativeInputs[0]!.id).toBe("outbox-source-17");
    expect(proof.wire).toMatchObject([[{ id: "outbox-source-17" }]]);
  } finally {
    await proof.close();
  }
});

test("identical dispatcher descriptors do not collapse caller-local native client selections", async () => {
  const payload = { key: "two-clients", at: new Date() };
  const proof = await fixture({
    secondClient: true,
    async run(context, workflow) {
      return [
        await context.workflows.first!.send(workflow, payload, { id: "" }),
        await context.workflows.second!.send(workflow, payload),
      ];
    },
  });
  try {
    const sources = readRuntimeCompilationWorkflowAdmissions(proof.compilation.references)[0]![1];
    const first = sources.find((source) => source.useName === "first")!;
    const second = sources.find((source) => source.useName === "second")!;
    expect(first.descriptorId).toBe(second.descriptorId);
    expect(first.clientSelectionId).not.toBe(second.clientSelectionId);
    expect(await proof.invoke()).toEqual([
      { eventIds: ["native-event-1"] },
      { eventIds: ["native-event-2"] },
    ]);
    expect(proof.nativeInputs[0]!.client).not.toBe(proof.nativeInputs[1]!.client);
    expect(proof.acquired).toContain(proof.nativeInputs[0]!.client);
    expect(proof.acquired).toContain(proof.nativeInputs[1]!.client);
    expect(proof.nativeInputs[0]!.id).toBe("");
    expect(proof.calls.acquire).toBe(2);
  } finally {
    await proof.close();
  }
  expect(proof.calls.release).toBe(2);
});

test("dispatch preserves native middleware rejection and refuses non-native option authority", async () => {
  const rejection = new Error("exact native send rejection");
  let nativeCalls = 0;
  class Reject extends Middleware.BaseMiddleware {
    readonly id = "reject-send";
    async wrapSendEvent(): Promise<never> {
      nativeCalls++;
      throw rejection;
    }
  }
  const payload = { key: "reject", at: new Date() };
  const proof = await fixture({
    middleware: [Reject],
    async run(context, workflow) {
      await expect(
        // @ts-expect-error Dispatcher options do not grant environment selection.
        context.workflows.first!.send(workflow, payload, { env: "other" })
      ).rejects.toThrow(TypeError);
      // @ts-expect-error Event IDs retain the native string lane.
      await expect(context.workflows.first!.send(workflow, payload, { id: 7 })).rejects.toThrow(
        TypeError
      );
      return context.workflows.first!.send(workflow, payload);
    },
  });
  try {
    await expect(proof.invoke()).rejects.toBe(rejection);
    expect(nativeCalls).toBe(1);
    expect(proof.calls.validate).toBe(1);
    expect(proof.wire).toEqual([]);
  } finally {
    await proof.close();
  }
});

test("native send settlement outlives both interrupted and unawaited server callers", async () => {
  for (const mode of ["interrupted", "unawaited"] as const) {
    const entered = deferred();
    const release = deferred();
    const events: string[] = [];
    class Hold extends Middleware.BaseMiddleware {
      readonly id = "hold-native-send-completion";
      async wrapSendEvent({ next }: Middleware.WrapSendEventArgs) {
        const result = await next();
        entered.resolve();
        await release.promise;
        events.push("native-send-settled");
        return result;
      }
    }
    const payload = { key: mode, at: new Date() };
    const proof = await fixture({
      middleware: [Hold],
      ...(mode === "interrupted"
        ? {
            effect: (context: RequestContext, workflow: Workflow) =>
              Effect.tryPromise({
                try: () => context.workflows.first!.send(workflow, payload),
                catch: (error) => error,
              }),
          }
        : {
            run(context: RequestContext, workflow: Workflow) {
              void context.workflows.first!.send(workflow, payload);
              return "caller-returned";
            },
          }),
    });
    const controller = new AbortController();
    const reason = new Error("native request cancelled");
    const invoking = proof.invoke(controller.signal);
    const outcome = invoking.catch((error) => error);
    try {
      await entered.promise;
      if (mode === "interrupted") {
        controller.abort(reason);
        expect(await outcome).toBe(reason);
      } else expect(await outcome).toBe("caller-returned");
      let stopped = false;
      const stop = proof.runtime.stop();
      expect(proof.runtime.stop()).toBe(stop);
      void stop.then(() => {
        stopped = true;
        events.push("process-stopped");
      });
      await Promise.resolve();
      expect(stopped).toBe(false);
      expect(proof.calls.release).toBe(0);
      expect(() => proof.invoke()).toThrow("admission is closed");
      release.resolve();
      await stop;
      expect(proof.calls.release).toBe(1);
      expect(events).toEqual(["native-send-settled", "process-stopped"]);
    } finally {
      release.resolve();
      await outcome;
      await proof.close();
    }
  }
});

test("an admitted native stream can dispatch during drain but its expired view cannot", async () => {
  const payload = { key: "stream", at: new Date() };
  const proof = await fixture({
    run(context, workflow) {
      return (async function* () {
        yield await context.workflows.first!.send(workflow, payload);
      })();
    },
  });
  try {
    const output = await proof.invoke();
    if (!isAsyncIteratorObject(output) || output.return === undefined)
      throw new Error("Expected a retained native iterator.");
    const stopping = proof.runtime.stop();
    expect(proof.calls.release).toBe(0);
    expect(await output.next()).toEqual({ done: false, value: { eventIds: ["native-event-1"] } });
    expect(proof.calls.release).toBe(0);
    await output.return();
    await stopping;
    expect(proof.calls.release).toBe(1);
    await expect(proof.context().workflows.first!.send(proof.workflow, payload)).rejects.toThrow(
      "expired"
    );
  } finally {
    await proof.close();
  }
});
