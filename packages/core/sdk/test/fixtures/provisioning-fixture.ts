import { closeSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import { Type } from "typebox";
import { orderBootgraph } from "../../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../../runtime/compiler/src/index";
import {
  type AppRole,
  defineApp,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  type ProcessDefinition,
  providerFx,
  providerSelection,
  type ResourceLifetime,
  requireResource,
  runtimeLaunchIdentity,
  sealService,
  useService,
} from "../../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../../runtime/derivation/src/index";
import { RuntimeSchema } from "../../../runtime/schema/src/index";

export interface FileLease {
  readonly fd: number;
  readonly path: string;
  readonly pid: number;
}

/** Authoring locals do not escape this producer; retained artifacts carry provisioning authority. */
export function produceProvisioningFixture(
  appRoot: string,
  options: {
    processId?: string;
    cohost?: boolean;
    serviceConfig?: boolean;
    requiredFile?: boolean;
    lifetime?: ResourceLifetime;
    role?: AppRole;
    dependent?: boolean;
    asyncConfig?: boolean;
  } = {}
) {
  const calls = { build: 0, acquire: 0, release: 0, construct: 0 };
  const asyncCalls = { decode: 0, build: 0, acquire: 0, release: 0 };
  const processId = options.processId ?? "process";
  const resource = defineRuntimeResource<"file-lease", FileLease>({
    id: "file-lease",
    title: "File lease",
    purpose: "Real process-owned filesystem lease",
    allowedLifetimes: ["process", "role"],
  });
  const qualification = {
    ...(options.lifetime === undefined ? {} : { lifetime: options.lifetime }),
    ...(options.role === undefined ? {} : { role: options.role }),
  };
  const serverRequirement = requireResource({ resource, reason: "server lease", ...qualification });
  const asyncRequirement = requireResource({ resource, reason: "async lease", ...qualification });
  const provider = defineRuntimeProvider({
    id: "file-lease.provider",
    title: "File lease",
    provides: resource,
    requires: [],
    build: () => {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: () => {
            calls.acquire++;
            const path = join(appRoot, `${processId}-${process.pid}.lease`);
            const fd = openSync(path, "wx");
            writeFileSync(fd, `${process.pid}\n`);
            return { fd, path, pid: process.pid };
          },
          catch: (cause) => cause,
        }),
        release: (lease) =>
          providerFx.tryPromise({
            try: () => {
              calls.release++;
              closeSync(lease.fd);
              unlinkSync(lease.path);
            },
            catch: (cause): never => {
              throw cause;
            },
          }),
      });
    },
  });
  const dependentResource = defineRuntimeResource<"lease-consumer", FileLease>({
    id: "lease-consumer",
    title: "Lease consumer",
    purpose: "An ordered provider dependency using the existing file lease",
  });
  const dependency = requireResource({
    resource,
    reason: "file lease dependency",
    ...qualification,
  });
  const dependentRequirement = requireResource({
    resource: dependentResource,
    reason: "dependent lease",
  });
  const dependentProvider = defineRuntimeProvider({
    id: "lease-consumer.provider",
    title: "Lease consumer",
    provides: dependentResource,
    requires: [dependency],
    build: (context) => {
      calls.build++;
      const lease = context.resources.get(dependency);
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: () => {
            calls.acquire++;
            return lease;
          },
          catch: (cause) => cause,
        }),
        release: () =>
          providerFx.tryPromise({
            try: () => {
              calls.release++;
            },
            catch: (cause): never => {
              throw cause;
            },
          }),
      });
    },
  });
  const configuredAsyncResource = defineRuntimeResource<
    "configured-async-lease",
    { readonly lease: FileLease; readonly label: string }
  >({
    id: "configured-async-lease",
    title: "Configured async lease",
    purpose: "An async-only provider with selected, typed configuration",
  });
  const configuredAsyncRequirement = requireResource({
    resource: configuredAsyncResource,
    reason: "configured async lease",
  });
  const configuredAsyncDependency = requireResource({
    resource,
    reason: "configured async file dependency",
    ...qualification,
  });
  const asyncSchema = RuntimeSchema.fromTypeBox(
    Type.Object({ label: Type.String() }, { additionalProperties: false })
  );
  const configuredAsyncProvider = defineRuntimeProvider({
    id: "configured-async-lease.provider",
    title: "Configured async lease",
    provides: configuredAsyncResource,
    requires: [configuredAsyncDependency],
    configSchema: Object.freeze({
      ...asyncSchema,
      decode(input: unknown) {
        asyncCalls.decode++;
        return asyncSchema.decode(input);
      },
    }),
    build: (context) => {
      asyncCalls.build++;
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: () => {
            asyncCalls.acquire++;
            return {
              lease: context.resources.get(configuredAsyncDependency),
              label: context.config.label,
            };
          },
          catch: (cause) => cause,
        }),
        release: () =>
          providerFx.tryPromise({
            try: () => {
              asyncCalls.release++;
            },
            catch: (cause): never => {
              throw cause;
            },
          }),
      });
    },
  });
  const definition = defineService({
    id: "configured",
    deps: {},
    config: RuntimeSchema.fromTypeBox(Type.Object({ label: Type.String() })),
  });
  const contract = definition.oc.router({
    read: definition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const implementation = implement(contract).$context<WithEffectContext<never>>();
  const router = implementation.router({ read: implementation.read.handler(({ input }) => input) });
  const service = sealService(definition, {
    contract,
    construct: ({ clients }) => {
      calls.construct++;
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  const server = definePlugin({
    id: "server",
    role: "server",
    surface: "server/api",
    capability: "lease",
    services: options.serviceConfig
      ? {
          configured: useService(service, {
            binding: { config: { kind: "runtime.config", key: "service" } },
          }),
        }
      : {},
    resourceRequirements: options.dependent
      ? [serverRequirement, dependentRequirement]
      : [serverRequirement],
    project: () => ({ kind: "plugin.projection", facts: {} }),
  });
  const asyncPlugin = definePlugin({
    id: "async",
    role: "async",
    surface: "async/workflow",
    capability: "lease",
    services: {},
    resourceRequirements: options.asyncConfig
      ? [asyncRequirement, configuredAsyncRequirement]
      : [asyncRequirement],
    project: () => ({ kind: "plugin.projection", facts: {} }),
  });
  const app = defineApp({ id: "provisioning", plugins: [server, asyncPlugin] });
  const profile = defineRuntimeProfile({
    id: "profile",
    providers: [
      providerSelection({ resource, provider, ...qualification }),
      ...(options.dependent
        ? [providerSelection({ resource: dependentResource, provider: dependentProvider })]
        : []),
      ...(options.asyncConfig
        ? [
            providerSelection({
              resource: configuredAsyncResource,
              provider: configuredAsyncProvider,
              config: { kind: "runtime.config", key: "async.provider" },
            }),
          ]
        : []),
    ],
    configSources: options.requiredFile
      ? [{ kind: "file", path: "required.json", optional: false }]
      : options.serviceConfig || options.asyncConfig
        ? [{ kind: "test" }]
        : [],
  });
  const selected = defineProcessCatalog({
    main: { id: processId, roles: options.cohost ? ["server", "async"] : ["server"] },
  }).main;
  function realize(processDefinition: ProcessDefinition) {
    const entrypoint = defineEntrypoint({
      id: processDefinition.id,
      app,
      profile,
      process: processDefinition,
      identity: runtimeLaunchIdentity({
        app: app.id,
        process: processDefinition.id,
        entrypoint: processDefinition.id,
        deployment: "test",
        source: "sdk-proof",
      }),
    });
    const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
    const compilation = compileRuntimePlan({ derivation });
    return {
      compilation,
      descriptorTable: derivation.executionDescriptorTable,
      bootgraph: orderBootgraph(compilation.plan.bootgraphInput),
    };
  }
  const asyncArtifacts = options.asyncConfig
    ? realize(defineProcessCatalog({ main: { id: `${processId}.async`, roles: ["async"] } }).main)
    : undefined;
  return {
    ...realize(selected),
    asyncArtifacts,
    profileProviderIds: Object.freeze(profile.providers.map((selection) => selection.provider.id)),
    calls,
    asyncCalls,
    serverRequirement,
    asyncRequirement,
    dependentRequirement,
    configuredAsyncRequirement,
  };
}
