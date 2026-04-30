import { describe, expect, test } from "bun:test";
import { Effect } from "@rawr/sdk/effect";
import { providerFx, defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import {
  defineRuntimeResource,
  resourceRequirement,
} from "@rawr/sdk/runtime/resources";
import {
  defineRuntimeProfile,
  providerSelection,
} from "@rawr/sdk/runtime/profiles";
import { defineRuntimeSchema, type RuntimeSchema } from "@rawr/sdk/runtime/schema";
import {
  createRuntimeBoundaryPolicy,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  executeMiniBootgraph,
  providerBootResourceKey,
  providerBootResourceModuleId,
  type MiniBootgraphModule,
} from "../../src/mini-runtime";
import type { InMemoryRuntimeCatalog } from "../../src/mini-runtime/catalog";
import { deriveProviderDependencyGraph } from "../../src/spine/derive";

interface TestClock {
  now(): Date;
}

interface TestEmailSender {
  send(input: { readonly to: string; readonly subject: string }): Promise<void>;
}

interface EmailConfig {
  readonly from: string;
  readonly apiKey?: string;
  readonly liveHandle?: () => void;
}

const ClockResource = defineRuntimeResource<"test.clock", TestClock>({
  id: "test.clock",
  title: "Test clock",
});

const EmailSenderResource = defineRuntimeResource<
  "test.email-sender",
  TestEmailSender
>({
  id: "test.email-sender",
  title: "Test email sender",
});

function assertNoLiveHandles(value: unknown): void {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    throw new Error(`catalog leaked live handle value: ${String(value)}`);
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) assertNoLiveHandles(entry);
    return;
  }

  for (const entry of Object.values(value)) {
    assertNoLiveHandles(entry);
  }
}

function providerIdsFor(
  modules: readonly MiniBootgraphModule[],
  moduleIds: readonly string[],
): readonly string[] {
  const providerByModuleId = new Map(
    modules.map((module) => [module.id, String(module.metadata?.providerId)]),
  );

  return moduleIds.map((moduleId) => providerByModuleId.get(moduleId) ?? moduleId);
}

function phasesFor(catalog: InMemoryRuntimeCatalog, phase: string): readonly string[] {
  return catalog.records
    .filter((record) => record.phase === phase)
    .map((record) => record.subjectId);
}

function providerTraceJson(trace: ReturnType<typeof createProviderProvisioningTrace>): string {
  assertNoLiveHandles(trace);
  return JSON.stringify(trace);
}

function createEmailConfigSchema(
  parseEvents?: string[],
): RuntimeSchema<EmailConfig> {
  return defineRuntimeSchema({
    id: "test.email.config",
    parse(value) {
      parseEvents?.push("parse:test.email.config");
      const record = value as Partial<EmailConfig> | undefined;
      if (!record || typeof record !== "object" || typeof record.from !== "string") {
        throw new Error(`invalid email config: ${JSON.stringify(value)}`);
      }
      if (!record.from.includes("@")) {
        throw new Error(`invalid email config from ${JSON.stringify(value)}`);
      }
      return {
        from: record.from.toLowerCase(),
        apiKey: record.apiKey,
        liveHandle: record.liveHandle,
      };
    },
  });
}

function emailProviderModuleId(providerId = "test.email.memory"): string {
  return providerBootResourceModuleId(
    providerBootResourceKey({
      resourceId: EmailSenderResource.id,
      providerId,
      lifetime: "process",
      role: "server",
    }),
  );
}

function createClockProvider(input: {
  readonly events?: string[];
  readonly releaseFails?: boolean;
} = {}) {
  return defineRuntimeProvider({
    kind: "runtime.provider",
    id: "test.clock.system",
    title: "Test system clock",
    provides: ClockResource,
    requires: [],
    build() {
      return providerFx.acquireRelease({
        acquire: function* () {
          input.events?.push("acquire:test.clock.system");
          return yield* Effect.succeed({
            now() {
              return new Date(0);
            },
          } satisfies TestClock);
        },
        release: () => {
          input.events?.push("release:test.clock.system");
          if (input.releaseFails) {
            return Effect.fail(new Error("clock release failed")) as never;
          }
          return Effect.sync(() => undefined);
        },
      });
    },
  });
}

function createEmailProvider(input: {
  readonly events?: string[];
  readonly buildEvents?: string[];
  readonly observedClock?: string[];
  readonly observedConfig?: EmailConfig[];
  readonly acquireFails?: boolean;
  readonly releaseFails?: boolean;
  readonly clockInstance?: string;
  readonly configSchema?: RuntimeSchema<EmailConfig>;
} = {}) {
  return defineRuntimeProvider<typeof EmailSenderResource, EmailConfig>({
    kind: "runtime.provider",
    id: "test.email.memory",
    title: "Test memory email sender",
    provides: EmailSenderResource,
    requires: [
      resourceRequirement(ClockResource, {
        lifetime: "process",
        role: "server",
        instance: input.clockInstance,
        reason: "timestamp outbound test mail",
      }),
    ],
    configSchema: input.configSchema,
    build(context) {
      input.buildEvents?.push("build:test.email.memory");
      input.observedConfig?.push(context.config);
      return providerFx.acquireRelease({
        acquire: function* () {
          input.events?.push("acquire:test.email.memory");
          context.telemetry.event("provider.test.email.acquire", {
            providerId: "test.email.memory",
          });
          context.diagnostics.report("email provider acquired through mini bootgraph");

          const clock = context.resources.get(ClockResource.id) as TestClock | undefined;
          input.observedClock?.push(clock?.now().toISOString() ?? "missing");

          if (input.acquireFails) {
            return yield* (Effect.fail(new Error("email acquire failed")) as never);
          }

          return yield* Effect.succeed({
            async send() {
              void context.config.from;
            },
          } satisfies TestEmailSender);
        },
        release: () => {
          input.events?.push("release:test.email.memory");
          if (input.releaseFails) {
            return Effect.fail(new Error("email release failed")) as never;
          }
          return Effect.sync(() => undefined);
        },
      });
    },
  });
}

function createProfile(input: {
  readonly clockProvider: ReturnType<typeof createClockProvider>;
  readonly emailProvider: ReturnType<typeof createEmailProvider>;
}) {
  return defineRuntimeProfile({
    kind: "runtime.profile",
    id: "provider-provisioning.test",
    providerSelections: [
      providerSelection({
        resource: EmailSenderResource,
        provider: input.emailProvider,
        lifetime: "process",
        role: "server",
      }),
      providerSelection({
        resource: ClockResource,
        provider: input.clockProvider,
        lifetime: "process",
        role: "server",
      }),
    ],
  });
}

describe("provider provisioning lowering", () => {
  test("runs acquire and release through dependency-ordered mini bootgraph modules", async () => {
    const events: string[] = [];
    const observedClock: string[] = [];
    const clockProvider = createClockProvider({ events });
    const emailProvider = createEmailProvider({ events, observedClock });
    const profile = createProfile({ clockProvider, emailProvider });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
      trace,
      configs: new Map([
        [
          emailProvider.id,
          {
            from: "lab@example.com",
            apiKey: "provider-secret",
            liveHandle() {},
          },
        ],
      ]),
    });

    expect(graph?.diagnostics).toEqual([]);

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;

    expect(providerIdsFor(modules, result.startupOrder)).toEqual([
      "test.clock.system",
      "test.email.memory",
    ]);
    expect(events).toEqual([
      "acquire:test.clock.system",
      "acquire:test.email.memory",
    ]);
    expect(observedClock).toEqual(["1970-01-01T00:00:00.000Z"]);

    const startupCatalog = result.catalog();
    const startupCatalogJson = JSON.stringify(startupCatalog);
    expect(startupCatalogJson).toContain("test.email.memory");
    expect(startupCatalogJson).not.toContain("provider-secret");
    expect(startupCatalogJson).not.toContain("liveHandle() {}");
    expect(providerTraceJson(trace)).not.toContain("provider-secret");
    assertNoLiveHandles(startupCatalog);

    const finalizedCatalog = await result.finalize();
    expect(events.slice(2)).toEqual([
      "release:test.email.memory",
      "release:test.clock.system",
    ]);
    expect(providerIdsFor(modules, phasesFor(finalizedCatalog, "boot.finalize.finished"))).toEqual([
      "test.email.memory",
      "test.clock.system",
    ]);
  });

  test("validates provider config through schema and redacts config snapshots", async () => {
    const observedConfig: EmailConfig[] = [];
    const parseEvents: string[] = [];
    const clockProvider = createClockProvider();
    const emailProvider = createEmailProvider({
      configSchema: createEmailConfigSchema(parseEvents),
      observedConfig,
    });
    const profile = createProfile({ clockProvider, emailProvider });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
      trace,
      configs: new Map([
        [
          emailProvider.id,
          {
            from: "fallback@example.com",
            apiKey: "fallback-secret",
          },
        ],
        [
          emailProviderModuleId(),
          {
            from: "LAB@EXAMPLE.COM",
            apiKey: "module-secret",
            liveHandle() {},
          },
        ],
      ]),
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;

    expect(parseEvents).toEqual(["parse:test.email.config"]);
    expect(observedConfig).toEqual([
      {
        from: "lab@example.com",
        apiKey: "module-secret",
        liveHandle: expect.any(Function),
      },
    ]);

    const startupCatalogJson = JSON.stringify(result.catalog());
    const traceJson = providerTraceJson(trace);
    expect(startupCatalogJson).toContain("test.email.config");
    expect(startupCatalogJson).not.toContain("module-secret");
    expect(startupCatalogJson).not.toContain("fallback-secret");
    expect(traceJson).not.toContain("module-secret");
    expect(traceJson).not.toContain("fallback-secret");
    expect(trace.events.map((event) => event.name)).toContain(
      "provider.config.validated",
    );
    assertNoLiveHandles(result.catalog());
  });

  test("invalid provider config fails closed before provider build with safe diagnostics", async () => {
    const events: string[] = [];
    const buildEvents: string[] = [];
    const clockProvider = createClockProvider({ events });
    const emailProvider = createEmailProvider({
      buildEvents,
      configSchema: createEmailConfigSchema(),
      events,
    });
    const profile = createProfile({ clockProvider, emailProvider });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
      trace,
      configs: {
        [emailProvider.id]: {
          from: "not-an-email",
          apiKey: "invalid-secret",
          liveHandle() {},
        },
      },
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;

    expect(buildEvents).toEqual([]);
    expect(events).toEqual([
      "acquire:test.clock.system",
      "release:test.clock.system",
    ]);
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toBe(
      "provider.config.invalid: provider test.email.memory config invalid for schema test.email.config",
    );

    const catalogJson = JSON.stringify(result.catalog);
    const traceJson = providerTraceJson(trace);
    expect(catalogJson).toContain("provider.config.invalid");
    expect(traceJson).toContain("provider.config.invalid");
    expect(catalogJson).not.toContain("invalid-secret");
    expect(traceJson).not.toContain("invalid-secret");
    expect(catalogJson).not.toContain("liveHandle() {}");
    expect(traceJson).not.toContain("liveHandle() {}");
    assertNoLiveHandles(result.catalog);
  });

  test("matches provider dependencies by lifetime, role, and instance scope", async () => {
    const clockProvider = createClockProvider();
    const emailProvider = createEmailProvider({ clockInstance: "primary" });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "provider-provisioning.scoped",
      providerSelections: [
        providerSelection({
          resource: EmailSenderResource,
          provider: emailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ClockResource,
          provider: clockProvider,
          lifetime: "process",
          role: "server",
          instance: "primary",
        }),
        providerSelection({
          resource: ClockResource,
          provider: clockProvider,
          lifetime: "role",
          role: "server",
          instance: "primary",
        }),
      ],
    });
    const graph = deriveProviderDependencyGraph(profile);
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
    });
    const emailModule = modules.find(
      (module) => module.metadata?.providerId === emailProvider.id,
    );

    expect(graph?.diagnostics).toEqual([]);
    expect(emailModule).toBeDefined();
    expect(emailModule?.dependencies).toHaveLength(1);

    const dependencyModule = modules.find(
      (module) => module.id === emailModule?.dependencies?.[0],
    );

    expect(dependencyModule?.metadata).toMatchObject({
      resourceId: ClockResource.id,
      providerId: clockProvider.id,
      lifetime: "process",
      role: "server",
      instance: "primary",
    });
    expect(dependencyModule?.metadata?.providerGraphNode).toMatchObject({
      resourceId: ClockResource.id,
      providerId: clockProvider.id,
      lifetime: "process",
      role: "server",
      instance: "primary",
    });
  });

  test("fails closed before provisioning when provider graph diagnostics exist", () => {
    const emailProvider = createEmailProvider();
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "provider-provisioning.missing-dependency",
      providerSelections: [
        providerSelection({
          resource: EmailSenderResource,
          provider: emailProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const graph = deriveProviderDependencyGraph(profile);

    expect(graph?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "provider.coverage.missing",
    ]);
    expect(() =>
      createProviderProvisioningModules({
        profileId: profile.id,
        providerSelections: profile.providerSelections,
        providerDependencyGraph: graph,
        processId: "process-1",
      }),
    ).toThrow("provider dependency graph has diagnostics: provider.coverage.missing");
  });

  test("rolls back acquired providers when a dependent acquire fails", async () => {
    const events: string[] = [];
    const clockProvider = createClockProvider({ events });
    const emailProvider = createEmailProvider({ events, acquireFails: true });
    const profile = createProfile({ clockProvider, emailProvider });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
      trace,
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          retry: { maxAttempts: 1, attempt: 1 },
        });
      },
      configs: {
        [emailProvider.id]: {
          from: "lab@example.com",
          apiKey: "rollback-secret",
          liveHandle() {},
        },
      },
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;

    expect(providerIdsFor(modules, result.startupOrder)).toEqual([
      "test.clock.system",
      "test.email.memory",
    ]);
    expect(providerIdsFor(modules, result.rollbackOrder)).toEqual([
      "test.clock.system",
    ]);
    expect(events).toEqual([
      "acquire:test.clock.system",
      "acquire:test.email.memory",
      "release:test.clock.system",
    ]);
    expect(providerIdsFor(modules, phasesFor(result.catalog, "boot.rollback.finished"))).toEqual([
      "test.clock.system",
    ]);
    expect(
      trace.events.find(
        (event) =>
          event.name === "boundary.policy.exit" &&
          event.attributes?.boundaryPolicy === "provider.acquire" &&
          event.attributes?.subjectId === emailProviderModuleId(),
      )?.attributes,
    ).toMatchObject({
      exit: {
        exit: "failure",
        cause: "failure",
      },
    });
    expect(JSON.stringify(result.catalog)).not.toContain("rollback-secret");
    assertNoLiveHandles(result.catalog);
  });

  test("records release failures and continues reverse finalization", async () => {
    const events: string[] = [];
    const clockProvider = createClockProvider({ events });
    const emailProvider = createEmailProvider({ events, releaseFails: true });
    const profile = createProfile({ clockProvider, emailProvider });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-1",
      trace,
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          retry: { maxAttempts: 1, attempt: 1 },
        });
      },
      configs: {
        [emailProvider.id]: {
          from: "lab@example.com",
          apiKey: "release-secret",
          liveHandle() {},
        },
      },
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;

    const finalizedCatalog = await result.finalize();

    expect(events.slice(2)).toEqual([
      "release:test.email.memory",
      "release:test.clock.system",
    ]);
    expect(providerIdsFor(modules, phasesFor(finalizedCatalog, "boot.finalize.failed"))).toEqual([
      "test.email.memory",
    ]);
    expect(providerIdsFor(modules, phasesFor(finalizedCatalog, "boot.finalize.finished"))).toEqual([
      "test.clock.system",
    ]);
    expect(
      trace.events.find(
        (event) =>
          event.name === "boundary.policy.exit" &&
          event.attributes?.boundaryPolicy === "provider.release" &&
          event.attributes?.subjectId === emailProviderModuleId(),
      )?.attributes,
    ).toMatchObject({
      exit: {
        exit: "failure",
        cause: "failure",
      },
    });
    expect(JSON.stringify(finalizedCatalog)).not.toContain("release-secret");
    assertNoLiveHandles(finalizedCatalog);
  });

  test("records provider boundary policies with redacted metadata", async () => {
    const clockProvider = createClockProvider();
    const emailProvider = createEmailProvider();
    const profile = createProfile({ clockProvider, emailProvider });
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: deriveProviderDependencyGraph(profile),
      processId: "process-1",
      trace,
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          timeoutMs: 500,
          retry: { maxAttempts: 2, attempt: 1 },
          metadata: {
            providerId: key.providerId,
            secretToken: "provider-policy-secret",
          },
        });
      },
      configs: {
        [emailProvider.id]: {
          from: "lab@example.com",
          apiKey: "provider-secret",
        },
      },
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("started");
    if (result.status !== "started") throw result.error;

    await result.finalize();

    const policyEvents = trace.events.filter((event) =>
      event.name.startsWith("boundary.policy."),
    );
    expect(policyEvents.map((event) => event.name)).toEqual([
      "boundary.policy.enter",
      "boundary.policy.exit",
      "boundary.policy.enter",
      "boundary.policy.exit",
      "boundary.policy.enter",
      "boundary.policy.exit",
      "boundary.policy.enter",
      "boundary.policy.exit",
    ]);
    expect(
      policyEvents.map((event) => event.attributes?.boundaryPolicy),
    ).toContain("provider.acquire");
    expect(
      policyEvents.map((event) => event.attributes?.boundaryPolicy),
    ).toContain("provider.release");
    expect(policyEvents.at(1)?.attributes).toMatchObject({
      timeoutMs: 500,
      retry: { maxAttempts: 2, attempt: 1 },
      exit: {
        exit: "success",
        cause: "none",
      },
    });
    expect(providerTraceJson(trace)).not.toContain("provider-policy-secret");
    expect(providerTraceJson(trace)).not.toContain("provider-secret");
  });

  test("fails closed when a provider returns an unlowerable plan", async () => {
    const provider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.unlowerable",
      title: "Unlowerable clock",
      provides: ClockResource,
      requires: [],
      build() {
        return {
          kind: "provider.effect-plan",
          boundary: "provider.acquire",
        } as never;
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "provider-provisioning.unlowerable",
      providerSelections: [
        providerSelection({
          resource: ClockResource,
          provider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: deriveProviderDependencyGraph(profile),
      processId: "process-1",
    });

    const result = await executeMiniBootgraph({ modules });

    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;

    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain(
      "unlowerable ProviderEffectPlan",
    );
    expect(phasesFor(result.catalog, "boot.failed")).toEqual([modules[0]?.id]);
  });
});
