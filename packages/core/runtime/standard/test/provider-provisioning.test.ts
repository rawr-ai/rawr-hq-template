import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import { Effect } from "@rawr/sdk/effect";
import {
  defineRuntimeProfile,
  providerSelection,
} from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import { providerFx } from "@rawr/sdk/runtime/providers/effect";
import {
  defineRuntimeResource,
  resourceRequirement,
} from "@rawr/sdk/runtime/resources";
import { RuntimeSchema } from "@rawr/sdk/runtime/schema";
import {
  createInMemorySecretStore,
  createRuntimeCatalogRecorder,
  createRuntimeConfigStore,
  deriveProviderDependencyGraph,
  loadRuntimeConfigSources,
  persistRuntimeCatalogSnapshot,
  providerBootResourceModuleId,
  secretRef,
  startProviderProvisioning,
} from "../src";

interface TestClock {
  now(): Date;
}

interface MailerConfig {
  readonly from: string;
  readonly apiKey: string;
  readonly dsn: string;
  readonly endpoint: string;
}

interface TestMailer {
  send(to: string): string;
}

const ClockResource = defineRuntimeResource<"test.clock", TestClock>({
  id: "test.clock",
  title: "Test clock",
  purpose: "Test-only clock dependency.",
  defaultLifetime: "process",
});

const MailerResource = defineRuntimeResource<"test.mailer", TestMailer>({
  id: "test.mailer",
  title: "Test mailer",
  purpose: "Test-only provider requiring config and a clock.",
  defaultLifetime: "process",
});

const mailerConfigSchema = RuntimeSchema.struct(
  {
    from: RuntimeSchema.string({ id: "test.mailer.from" }),
    apiKey: RuntimeSchema.redactedString({ id: "test.mailer.api-key" }),
    dsn: RuntimeSchema.redactedString({ id: "test.mailer.dsn" }),
    endpoint: RuntimeSchema.string({ id: "test.mailer.endpoint" }),
  },
  { id: "test.mailer.config" },
);

describe("@rawr/core-runtime-standard provider provisioning", () => {
  test("loads config sources with deterministic source-order override", async () => {
    const store = await loadRuntimeConfigSources(
      [
        { kind: "file", path: "runtime.json" },
        { kind: "env", prefix: "RAWR_" },
      ],
      {
        env: {
          RAWR_MAILER: "env-mailer",
          IGNORED: "ignored",
        },
        readFile: async () => JSON.stringify({ MAILER: "file-mailer", fileOnly: true }),
      },
    );

    expect(store.get("MAILER")).toBe("env-mailer");
    expect(store.get("fileOnly")).toBe(true);
    expect(store.get("IGNORED")).toBeUndefined();
  });

  test("acquires providers through bootgraph order with secret-backed config and redacted catalog persistence", async () => {
    const events: string[] = [];
    const observedConfig: MailerConfig[] = [];
    const clockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.system",
      title: "Test system clock",
      provides: ClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.succeed({
              now: () => new Date(0),
            } satisfies TestClock),
          release: () =>
            Effect.sync(() => {
              events.push("release:clock");
            }),
        });
      },
    });
    const mailerProvider = defineRuntimeProvider<typeof MailerResource, MailerConfig>({
      kind: "runtime.provider",
      id: "test.mailer.memory",
      title: "Test memory mailer",
      provides: MailerResource,
      requires: [
        resourceRequirement(ClockResource, {
          lifetime: "process",
          role: "server",
          reason: "timestamp mail",
        }),
      ],
      configSchema: mailerConfigSchema,
      build(context) {
        observedConfig.push(context.config);
        const clock = context.resources.get(ClockResource.id) as TestClock;
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.sync(() => {
              events.push(`acquire:mailer:${clock.now().toISOString()}`);
              return {
                send: (to: string) => `${context.config.from}->${to}`,
              } satisfies TestMailer;
            }),
          release: () =>
            Effect.sync(() => {
              events.push("release:mailer");
            }),
        });
      },
    });
    const profile = defineRuntimeProfile({
      id: "provider.test",
      providerSelections: [
        providerSelection({
          resource: MailerResource,
          provider: mailerProvider,
          lifetime: "process",
          role: "server",
          configKey: "mailer.primary",
        }),
        providerSelection({
          resource: ClockResource,
          provider: clockProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const graph = deriveProviderDependencyGraph({
      providerSelections: profile.providerSelections,
    });
    const catalog = createRuntimeCatalogRecorder({ runId: "provider-test" });

    expect(graph.diagnostics).toEqual([]);

    const started = await startProviderProvisioning({
      profileId: profile.id,
      processId: "process-test",
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      configStore: createRuntimeConfigStore({
        "mailer.primary": {
          from: "ops@example.com",
          apiKey: "direct-provider-secret",
          dsn: "direct-provider-dsn",
          endpoint: secretRef("mailer.endpoint"),
        },
      }),
      secretStore: createInMemorySecretStore({
        "mailer.endpoint": "live-provider-endpoint",
      }),
      catalog,
    });

    expect(started.diagnostics).toEqual([]);
    expect(
      started.startedModuleIds.map((moduleId) => {
        if (moduleId.startsWith("runtime:effect-runtime:")) return "effect";
        if (moduleId.includes("test.clock.system")) return "clock";
        if (moduleId.includes("test.mailer.memory")) return "mailer";
        return moduleId;
      }),
    ).toEqual(["effect", "clock", "mailer"]);
    expect(events).toEqual(["acquire:mailer:1970-01-01T00:00:00.000Z"]);
    expect(observedConfig).toEqual([
      {
        from: "ops@example.com",
        apiKey: "direct-provider-secret",
        dsn: "direct-provider-dsn",
        endpoint: "live-provider-endpoint",
      },
    ]);

    await started.stop();
    expect(events.slice(1)).toEqual(["release:mailer", "release:clock"]);
    expect(catalog.snapshot().records.map((record) => record.phase)).toContain(
      "runtime.effect-runtime.dispose",
    );
    const acquireSuccessRecord = catalog.snapshot().records.find(
      (record) =>
        record.phase === "provider.acquire.success" &&
        record.subjectId.includes("test.mailer.memory"),
    );
    expect(acquireSuccessRecord?.attributes).not.toHaveProperty("value");

    const tempDir = await mkdtemp(join(tmpdir(), "rawr-catalog-"));
    try {
      const path = await persistRuntimeCatalogSnapshot({
        snapshot: catalog.snapshot(),
        rootDir: tempDir,
      });
      const persisted = await readFile(path, "utf8");
      expect(persisted).toContain("test.mailer.memory");
      expect(persisted).not.toContain("direct-provider-secret");
      expect(persisted).not.toContain("direct-provider-dsn");
      expect(persisted).not.toContain("live-provider-endpoint");
      expect(persisted).not.toContain("apiKey");
      expect(persisted).not.toContain("dsn");
      expect(persisted).not.toContain("endpoint");
      await expect(
        persistRuntimeCatalogSnapshot({
          snapshot: catalog.snapshot(),
          rootDir: tempDir,
          fileName: "../escape.json",
        }),
      ).rejects.toThrow("fileName");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("fails closed when provider dependency coverage is missing", async () => {
    const mailerProvider = defineRuntimeProvider<typeof MailerResource, MailerConfig>({
      kind: "runtime.provider",
      id: "test.mailer.memory",
      title: "Test memory mailer",
      provides: MailerResource,
      requires: [
        resourceRequirement(ClockResource, {
          lifetime: "process",
          role: "server",
          reason: "timestamp mail",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: () => Effect.succeed({ send: (to) => to } satisfies TestMailer),
        });
      },
    });
    const graph = deriveProviderDependencyGraph({
      providerSelections: [
        providerSelection({
          resource: MailerResource,
          provider: mailerProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });

    expect(graph.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider.missing-dependency",
    );
    await expect(
      startProviderProvisioning({
        profileId: "bad-profile",
        processId: "process-test",
        providerSelections: [
          providerSelection({
            resource: MailerResource,
            provider: mailerProvider,
            lifetime: "process",
            role: "server",
          }),
        ],
        providerDependencyGraph: graph,
      }),
    ).rejects.toThrow("runtime.provider.missing-dependency");
  });

  test("keeps full provider identity in boot resource module ids", () => {
    const left = providerBootResourceModuleId({
      resourceId: "clock",
      providerId: "clock.system",
      lifetime: "process",
      role: "server",
    });
    const right = providerBootResourceModuleId({
      resourceId: "clock",
      providerId: "clock.system",
      lifetime: "process",
      role: "async",
    });

    expect(left).not.toBe(right);
  });

  test("prefers exact dependency role matches over unscoped fallbacks", () => {
    const globalClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.global",
      title: "Test global clock",
      provides: ClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.succeed({ now: () => new Date(0) } satisfies TestClock),
        });
      },
    });
    const serverClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.server",
      title: "Test server clock",
      provides: ClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.succeed({ now: () => new Date(1) } satisfies TestClock),
        });
      },
    });
    const mailerProvider = defineRuntimeProvider<typeof MailerResource, MailerConfig>({
      kind: "runtime.provider",
      id: "test.mailer.role-specific",
      title: "Test role-specific mailer",
      provides: MailerResource,
      requires: [
        resourceRequirement(ClockResource, {
          lifetime: "process",
          role: "server",
          reason: "server mail clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: () => Effect.succeed({ send: (to) => to } satisfies TestMailer),
        });
      },
    });
    const graph = deriveProviderDependencyGraph({
      providerSelections: [
        providerSelection({
          resource: MailerResource,
          provider: mailerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ClockResource,
          provider: globalClockProvider,
          lifetime: "process",
        }),
        providerSelection({
          resource: ClockResource,
          provider: serverClockProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const edge = graph.edges.find((candidate) =>
      candidate.fromModuleId.includes("test.mailer.role-specific"),
    );

    expect(graph.diagnostics).toEqual([]);
    expect(edge?.toModuleId).toBe(
      providerBootResourceModuleId({
        resourceId: "test.clock",
        providerId: "test.clock.server",
        lifetime: "process",
        role: "server",
      }),
    );
  });

  test("diagnoses ambiguous dependency fallback providers", () => {
    const leftClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.left",
      title: "Test left clock",
      provides: ClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.succeed({ now: () => new Date(0) } satisfies TestClock),
        });
      },
    });
    const rightClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "test.clock.right",
      title: "Test right clock",
      provides: ClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: () =>
            Effect.succeed({ now: () => new Date(1) } satisfies TestClock),
        });
      },
    });
    const mailerProvider = defineRuntimeProvider<typeof MailerResource, MailerConfig>({
      kind: "runtime.provider",
      id: "test.mailer.ambiguous",
      title: "Test ambiguous mailer",
      provides: MailerResource,
      requires: [
        resourceRequirement(ClockResource, {
          lifetime: "process",
          role: "server",
          reason: "server mail clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: () => Effect.succeed({ send: (to) => to } satisfies TestMailer),
        });
      },
    });
    const graph = deriveProviderDependencyGraph({
      providerSelections: [
        providerSelection({
          resource: MailerResource,
          provider: mailerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ClockResource,
          provider: leftClockProvider,
          lifetime: "process",
        }),
        providerSelection({
          resource: ClockResource,
          provider: rightClockProvider,
          lifetime: "process",
        }),
      ],
    });

    expect(graph.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider.ambiguous-dependency",
    );
  });
});
