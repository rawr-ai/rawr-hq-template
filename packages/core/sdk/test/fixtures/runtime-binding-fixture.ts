import { closeSync, fstatSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import "@orpc/experimental-effect/extensions/effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { Type } from "typebox";

import { orderBootgraph } from "../../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../../runtime/compiler/src/index";
import {
  defineApp,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  providerFx,
  providerSelection,
  requireResource,
  resourceDep,
  runtimeLaunchIdentity,
  sealService,
  serviceDep,
  useService,
} from "../../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../../runtime/derivation/src/index";
import { RuntimeSchema } from "../../../runtime/schema/src/index";

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function produceBindingFixture(
  appRoot: string,
  options: { failConstructor?: boolean; swap?: boolean; pauseParentBetweenChildren?: boolean } = {}
) {
  const calls = { acquire: 0, release: 0, child: 0, parent: 0, effect: 0, promise: 0 };
  const events: string[] = [];
  const contexts: object[] = [];
  const invocationCalls = { decode: 0, validate: 0 };
  const invocationValues: Date[] = [];
  const dateSchema: RuntimeSchema<Date> = {
    kind: "runtime.schema",
    serializable: { type: "string", format: "date-time" },
    decode(input) {
      invocationCalls.decode++;
      return typeof input === "string" && Number.isFinite(Date.parse(input))
        ? { success: true, value: new Date(input) }
        : { success: false, issues: [{ message: "Expected encoded date string" }] };
    },
    validate(input) {
      invocationCalls.validate++;
      return input instanceof Date && Number.isFinite(input.getTime())
        ? { success: true, value: input }
        : { success: false, issues: [{ message: "Expected decoded Date" }] };
    },
    toRedactedShape() {
      return { schema: this.serializable };
    },
  };
  const dateDefinition = defineService({
    id: "binding.date",
    deps: {},
    invocation: dateSchema,
  });
  const dateContract = dateDefinition.oc.router({
    read: dateDefinition.oc.output(schemaType<string>()),
  });
  const dateService = sealService(dateDefinition, {
    contract: dateContract,
    construct: ({ clients }) => {
      const native = implement(dateContract).$context<WithEffectContext<never> & { date: Date }>();
      const router = native.router({
        read: native.read.effect(function* ({ context }) {
          invocationValues.push(context.date);
          return yield* Effect.succeed(context.date.toISOString());
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: dateDefinition.id,
        withInvocation: ({ invocation }) =>
          clients.bind({
            context: () => ({ date: invocation }),
            createNativeClient: (nativeOptions) => createRouterClient(router, nativeOptions),
          }),
      };
    },
  });
  const entered = deferred();
  const finalizing = deferred();
  const releaseFinalizer = deferred();
  const parentBetweenChildren = deferred();
  const resumeParent = deferred();
  const leasePath = join(appRoot, "binding.lease");
  const lease = defineRuntimeResource<"binding.lease", { readonly fd: number }>({
    id: "binding.lease",
    title: "Binding lease",
    purpose: "Real binding lifetime proof",
  });
  const provider = defineRuntimeProvider({
    id: "binding.lease.provider",
    title: "Lease",
    provides: lease,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          const fd = openSync(leasePath, "wx");
          writeFileSync(fd, "ready");
          events.push("acquired");
          return { fd };
        }),
        release: (value) =>
          Effect.sync(() => {
            calls.release++;
            events.push("released");
            closeSync(value.fd);
            unlinkSync(leasePath);
          }),
      }),
  });
  const childDefinition = defineService({
    id: "binding.child",
    deps: { lease: resourceDep(lease) },
    config: RuntimeSchema.fromTypeBox(Type.Object({ label: Type.String() })),
    invocation: RuntimeSchema.fromTypeBox(Type.Object({ trace: Type.String() })),
  });
  const contract = childDefinition.oc.router({
    read: childDefinition.oc.input(schemaType<string>()).output(schemaType<string>()),
    promise: childDefinition.oc.input(schemaType<string>()).output(schemaType<string>()),
    missing: childDefinition.oc
      .output(schemaType<string>())
      .errors({ MISSING: { data: schemaType<{ id: string }>() } }),
    wait: childDefinition.oc.output(schemaType<string>()),
  });
  const child = sealService(childDefinition, {
    contract,
    construct: ({ clients, config, deps }) => {
      calls.child++;
      if (options.failConstructor) throw new Error("constructor refused");
      const native = implement(contract).$context<
        WithEffectContext<never> & { trace: string; provided: object }
      >();
      const router = native.router({
        read: native.read.effect(function* ({ input, context }) {
          calls.effect++;
          contexts.push(context.provided);
          yield* Effect.sync(() => fstatSync(deps.lease.fd));
          if (options.pauseParentBetweenChildren) events.push(`child.read:${config.label}`);
          return `${config.label}:${context.trace}:${input}`;
        }),
        promise: native.promise.handler(async ({ input, context }) => {
          calls.promise++;
          contexts.push(context.provided);
          return `${config.label}:${context.trace}:${input}`;
        }),
        missing: native.missing.effect(function* ({ errors }) {
          return yield* Effect.fail(errors.MISSING({ data: { id: config.label } }));
        }),
        wait: native.wait.effect(function* () {
          entered.resolve();
          return yield* Effect.ensuring(
            Effect.never,
            Effect.promise(async () => {
              events.push("finalizing");
              finalizing.resolve();
              await releaseFinalizer.promise;
              events.push("finalized");
            })
          );
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: childDefinition.id,
        withInvocation: ({ invocation }) =>
          clients.bind({
            context: () => ({ trace: invocation.trace, provided: {} }),
            createNativeClient: (nativeOptions) => createRouterClient(router, nativeOptions),
          }),
      };
    },
  });
  const parentDefinition = defineService({
    id: "binding.parent",
    deps: { left: serviceDep(child), right: serviceDep(child) },
    invocation: RuntimeSchema.fromTypeBox(Type.Object({ trace: Type.String() })),
  });
  const parentContract = parentDefinition.oc.router({
    read: parentDefinition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const parent = sealService(parentDefinition, {
    contract: parentContract,
    construct: ({ clients, deps }) => {
      calls.parent++;
      const native = implement(parentContract).$context<
        WithEffectContext<never> & { trace: string }
      >();
      const router = native.router({
        read: native.read.effect(function* ({ input, context }) {
          if (options.pauseParentBetweenChildren) events.push("parent.entered");
          const invocation = { trace: context.trace };
          const left = yield* deps.left.withInvocation({ invocation }).read(input);
          if (options.pauseParentBetweenChildren) {
            events.push("parent.left.completed");
            parentBetweenChildren.resolve();
            yield* Effect.promise(() => resumeParent.promise);
          }
          const right = yield* deps.right.withInvocation({ invocation }).read(input);
          if (options.pauseParentBetweenChildren) events.push("parent.completed");
          return `${left}|${right}`;
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: parentDefinition.id,
        withInvocation: ({ invocation }) =>
          clients.bind({
            context: () => ({ trace: invocation.trace }),
            createNativeClient: (nativeOptions) => createRouterClient(router, nativeOptions),
          }),
      };
    },
  });
  const primary = {
    instance: "primary",
    config: { kind: "runtime.config" as const, key: "primary" },
  };
  const secondary = {
    instance: "secondary",
    config: { kind: "runtime.config" as const, key: "secondary" },
  };
  const normal = { dependencies: { left: primary, right: secondary } };
  const reversed = { dependencies: { left: secondary, right: primary } };
  const diamond = { dependencies: { left: primary, right: primary } };
  const required = requireResource({ resource: lease, reason: "binding proof" });
  const named = defineRuntimeResource<"binding.named", { readonly label: string }>({
    id: "binding.named",
    title: "Named value",
    purpose: "Named resource access proof",
  });
  const namedProvider = (label: string) =>
    defineRuntimeProvider({
      id: `binding.named.${label}`,
      title: label,
      provides: named,
      requires: [],
      build: () =>
        providerFx.acquireRelease({
          acquire: Effect.succeed({ label }),
          release: () => Effect.void,
        }),
    });
  const plugin = definePlugin({
    id: "binding.api",
    role: "server",
    surface: "server/api",
    capability: "binding",
    instance: "primary-api",
    services: {
      date: useService(dateService),
      normal: useService(parent, { instance: "normal", binding: options.swap ? reversed : normal }),
      alias: useService(parent, { instance: "normal", binding: options.swap ? reversed : normal }),
      reversed: useService(parent, { instance: "reversed", binding: reversed }),
      diamond: useService(parent, { instance: "diamond", binding: diamond }),
    },
    resourceRequirements: [
      required,
      requireResource({ resource: named, instance: "primary", reason: "primary named value" }),
      requireResource({ resource: named, instance: "secondary", reason: "secondary named value" }),
    ],
    project: () => ({ kind: "plugin.projection", facts: {} }),
  });
  const app = defineApp({ id: "binding-app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "binding-profile",
    providers: [
      providerSelection({ resource: lease, provider }),
      providerSelection({ resource: named, provider: namedProvider("P"), instance: "primary" }),
      providerSelection({ resource: named, provider: namedProvider("S"), instance: "secondary" }),
    ],
    configSources: [{ kind: "test" }],
  });
  const selected = defineProcessCatalog({
    main: { id: "binding-process", roles: ["server"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "binding-entrypoint",
    app,
    profile,
    process: selected,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: selected.id,
      entrypoint: "binding-entrypoint",
      deployment: "test",
      source: "sdk-binding-proof",
    }),
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  return {
    compilation,
    descriptorTable: derivation.executionDescriptorTable,
    bootgraph: orderBootgraph(compilation.plan.bootgraphInput),
    child,
    dateService,
    invocationCalls,
    invocationValues,
    parent,
    lease,
    named,
    leasePath,
    required,
    calls,
    contexts,
    events,
    entered,
    finalizing,
    releaseFinalizer,
    parentBetweenChildren,
    resumeParent,
    testConfig: { primary: { label: "P" }, secondary: { label: "S" } },
  };
}
