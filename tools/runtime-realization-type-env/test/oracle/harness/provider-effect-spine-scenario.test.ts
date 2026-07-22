import { describe, expect, test } from "bun:test";
import { Effect, type RawrEffect } from "@rawr/sdk/effect";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider, providerFx } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource, resourceRequirement } from "@rawr/sdk/runtime/resources";
import { defineRuntimeSchema } from "@rawr/sdk/runtime/schema";
import type {
  CompiledExecutionPlan,
  ExecutionDescriptor,
  ExecutionDescriptorRef,
} from "@rawr/sdk/spine";
import {
  type ContainedRuntimeResourceDefinition,
  createContainedRuntimeResourceAccess,
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createManagedEffectRuntimeAccess,
  createProcessExecutionRuntime,
  createProviderProvisioningModules,
  createProviderProvisioningTrace,
  createRuntimeBoundaryPolicy,
  type EffectRuntimeAccess,
  executeRuntimeBootgraph,
  type ProviderProvisionedValue,
  providerBootResourceModuleId,
} from "../../../src/oracle";
import { deriveProviderDependencyGraph } from "../../../src/spine/derive";

interface ScenarioClock {
  now(): Date;
}

interface ScenarioEmailSender {
  send(input: { readonly to: string; readonly subject: string }): Promise<{
    readonly accepted: true;
    readonly from: string;
    readonly at: string;
  }>;
}

interface ScenarioEmailConfig {
  readonly from: string;
  readonly apiKey: string;
  readonly liveHandle?: () => void;
}

const ScenarioClockResource = defineRuntimeResource<"scenario.clock", ScenarioClock>({
  id: "scenario.clock",
  title: "Scenario clock",
});

const ScenarioEmailResource = defineRuntimeResource<"scenario.email", ScenarioEmailSender>({
  id: "scenario.email",
  title: "Scenario email sender",
});

const ScenarioEmailConfigSchema = defineRuntimeSchema<"scenario.email.config", ScenarioEmailConfig>(
  {
    id: "scenario.email.config",
    parse(value) {
      const record = value as Partial<ScenarioEmailConfig> | undefined;
      if (!record || typeof record !== "object") {
        throw new Error("scenario email config must be an object");
      }
      if (typeof record.from !== "string" || !record.from.includes("@")) {
        throw new Error("scenario email config requires an email from address");
      }
      if (typeof record.apiKey !== "string" || record.apiKey.length === 0) {
        throw new Error("scenario email config requires an api key");
      }
      return {
        from: record.from.toLowerCase(),
        apiKey: record.apiKey,
        liveHandle: record.liveHandle,
      };
    },
  }
);

const SendScenarioEmailRef = {
  kind: "execution.descriptor-ref",
  boundary: "service.procedure",
  executionId: "exec:scenario:email:send",
  appId: "phase-two-lab",
  role: "server",
  surface: "service",
  capability: "scenario-email",
  serviceId: "scenario-email",
  procedurePath: ["send"],
} as const satisfies ExecutionDescriptorRef;

const SendScenarioEmailPlan = {
  kind: "compiled.execution-plan",
  ref: SendScenarioEmailRef,
  policy: {
    timeoutMs: 1000,
  },
} as const satisfies CompiledExecutionPlan;

function assertNoLiveHandles(value: unknown): void {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    throw new Error(`observation leaked live handle value: ${String(value)}`);
  }

  if (value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const entry of value) assertNoLiveHandles(entry);
    return;
  }

  for (const entry of Object.values(value)) {
    assertNoLiveHandles(entry);
  }
}

function createCountingEffectRuntime(): {
  readonly runtime: EffectRuntimeAccess;
  readonly runs: readonly string[];
} {
  const managed = createManagedEffectRuntimeAccess();
  const runs: string[] = [];

  return {
    runs,
    runtime: {
      kind: "effect.runtime-access",
      runPromiseExit(effect, options) {
        runs.push("runPromiseExit");
        return managed.runPromiseExit(effect, options);
      },
      dispose() {
        return managed.dispose();
      },
    },
  };
}

function providerResourceDefinitionsFromStartedValues(
  startedValues: ReadonlyMap<string, unknown>
): readonly ContainedRuntimeResourceDefinition[] {
  return [...startedValues.values()].flatMap((started) => {
    const providerValue = started as ProviderProvisionedValue | undefined;
    if (!providerValue || providerValue.kind !== "provider.provisioned-value") {
      return [];
    }

    return [
      {
        id: providerValue.key.resourceId,
        value: providerValue.value,
        metadata: {
          providerId: providerValue.key.providerId,
          moduleId: providerBootResourceModuleId(providerValue.key),
          secretToken: "runtime-resource-metadata-secret",
          liveHandle() {},
        },
      },
    ];
  });
}

describe("phase two provider/config/effect spine scenario", () => {
  test("provisions provider resources into runtime-owned Effect invocation access", async () => {
    const providerEvents: string[] = [];
    const secretObservations: string[] = [];
    const sends: string[] = [];
    const effectRuntime = createCountingEffectRuntime();

    const clockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "scenario.clock.fixed",
      title: "Scenario fixed clock",
      provides: ScenarioClockResource,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            providerEvents.push("acquire:clock");
            return yield* Effect.succeed({
              now() {
                return new Date(0);
              },
            } satisfies ScenarioClock);
          },
          release: () =>
            Effect.sync(() => {
              providerEvents.push("release:clock");
            }),
        });
      },
    });

    const emailProvider = defineRuntimeProvider<typeof ScenarioEmailResource, ScenarioEmailConfig>({
      kind: "runtime.provider",
      id: "scenario.email.memory",
      title: "Scenario memory email sender",
      provides: ScenarioEmailResource,
      requires: [
        resourceRequirement(ScenarioClockResource, {
          lifetime: "process",
          role: "server",
          reason: "timestamp scenario mail",
        }),
      ],
      configSchema: ScenarioEmailConfigSchema,
      build(context) {
        return providerFx.acquireRelease({
          acquire: function* () {
            providerEvents.push("acquire:email");
            secretObservations.push(
              context.config.apiKey === "scenario-secret"
                ? "secret-seen-during-acquire"
                : "secret-missing"
            );
            const clock = context.resources.get(ScenarioClockResource.id) as
              | ScenarioClock
              | undefined;
            const from = context.config.from;
            const acquiredAt = clock?.now().toISOString() ?? "missing-clock";

            return yield* Effect.succeed({
              async send(input) {
                sends.push(`${input.to}:${input.subject}`);
                return {
                  accepted: true,
                  from,
                  at: acquiredAt,
                };
              },
            } satisfies ScenarioEmailSender);
          },
          release: () =>
            Effect.sync(() => {
              providerEvents.push("release:email");
            }),
        });
      },
    });

    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "phase-two.provider-effect-spine",
      providerSelections: [
        providerSelection({
          resource: ScenarioEmailResource,
          provider: emailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ScenarioClockResource,
          provider: clockProvider,
          lifetime: "process",
          role: "server",
        }),
      ],
    });
    const graph = deriveProviderDependencyGraph(profile);
    const trace = createProviderProvisioningTrace();
    const modules = createProviderProvisioningModules({
      profileId: profile.id,
      providerSelections: profile.providerSelections,
      providerDependencyGraph: graph,
      processId: "process-provider-effect-spine",
      effectRuntime: effectRuntime.runtime,
      trace,
      boundaryPolicy({ phase, key }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${phase}:${key.providerId}`,
          boundary: phase === "acquire" ? "provider.acquire" : "provider.release",
          subjectId: providerBootResourceModuleId(key),
          retry: { maxAttempts: 1, attempt: 1 },
          metadata: {
            providerId: key.providerId,
            apiKey: "provider-policy-secret",
          },
        });
      },
      configs: {
        [emailProvider.id]: {
          from: "SCENARIO@EXAMPLE.COM",
          apiKey: "scenario-secret",
          liveHandle() {},
        },
      },
    });

    expect(graph?.diagnostics).toEqual([]);

    const boot = await executeRuntimeBootgraph({ modules });
    expect(boot.status).toBe("started");
    if (boot.status !== "started") throw boot.error;

    const resources = createContainedRuntimeResourceAccess(
      providerResourceDefinitionsFromStartedValues(boot.startedValues())
    );
    const descriptor = {
      kind: "execution.descriptor",
      ref: SendScenarioEmailRef,
      run(input) {
        const context = input as {
          readonly resources: typeof resources;
          readonly execution: { readonly traceId: string };
          readonly input: { readonly to: string; readonly subject: string };
        };

        return Effect.tryPromise({
          try: async () => {
            const email = context.resources.requireResource<ScenarioEmailSender>(
              ScenarioEmailResource.id
            );
            const clock = context.resources.requireResource<ScenarioClock>(
              ScenarioClockResource.id
            );

            context.resources.telemetry().event("scenario.email.send", {
              traceId: context.execution.traceId,
              apiKey: "runtime-access-telemetry-secret",
            });
            context.resources.emitDiagnostic({
              code: "scenario.email.sent",
              message: "scenario email sent",
              attributes: {
                traceId: context.execution.traceId,
                apiKey: "runtime-access-diagnostic-secret",
                liveHandle() {},
              },
            });

            const sent = await email.send(context.input);
            return {
              ...sent,
              checkedAt: clock.now().toISOString(),
            };
          },
          catch: (cause) => cause,
        }) as RawrEffect<
          {
            readonly accepted: true;
            readonly from: string;
            readonly at: string;
            readonly checkedAt: string;
          },
          unknown,
          never
        >;
      },
    } satisfies ExecutionDescriptor;
    const table = createExecutionDescriptorTable([{ ref: SendScenarioEmailRef, descriptor }]);
    const registry = createExecutionRegistry({
      plans: [SendScenarioEmailPlan],
      descriptorTable: table,
    });
    const runtime = createProcessExecutionRuntime({
      registry,
      effectRuntime: effectRuntime.runtime,
      boundaryPolicy({ ref }) {
        return createRuntimeBoundaryPolicy({
          policyId: `policy:${ref.executionId}`,
          boundary: ref.boundary,
          subjectId: ref.executionId,
          timeoutMs: 250,
          retry: { maxAttempts: 1, attempt: 1 },
          metadata: {
            apiKey: "process-boundary-policy-secret",
          },
        });
      },
    });

    try {
      const invocation = await runtime.invoke<{
        readonly accepted: true;
        readonly from: string;
        readonly at: string;
        readonly checkedAt: string;
      }>({
        ref: SendScenarioEmailRef,
        context: {
          resources,
          execution: { traceId: "trace-provider-effect-spine" },
          input: {
            to: "ops@example.com",
            subject: "provider spine",
          },
        },
      });

      expect(invocation.status).toBe("success");
      if (invocation.status !== "success") throw invocation.error;

      expect(invocation.output).toEqual({
        accepted: true,
        from: "scenario@example.com",
        at: "1970-01-01T00:00:00.000Z",
        checkedAt: "1970-01-01T00:00:00.000Z",
      });
      expect(providerEvents).toEqual(["acquire:clock", "acquire:email"]);
      expect(secretObservations).toEqual(["secret-seen-during-acquire"]);
      expect(sends).toEqual(["ops@example.com:provider spine"]);
      expect(effectRuntime.runs).toHaveLength(3);
      expect(
        invocation.events
          .filter((event) => event.name.startsWith("boundary.policy."))
          .map((event) => event.attributes?.boundaryPolicy)
      ).toEqual(["service.procedure", "service.procedure"]);

      const observationJson = JSON.stringify({
        catalog: boot.catalog(),
        trace,
        invocationEvents: invocation.events,
        resourceRecords: resources.records(),
        telemetry: resources.telemetryEvents(),
        diagnostics: resources.diagnosticRecords(),
      });
      expect(observationJson).toContain("scenario.email.memory");
      expect(observationJson).toContain("scenario.email.config");
      expect(observationJson).not.toContain("scenario-secret");
      expect(observationJson).not.toContain("provider-policy-secret");
      expect(observationJson).not.toContain("process-boundary-policy-secret");
      expect(observationJson).not.toContain("runtime-resource-metadata-secret");
      expect(observationJson).not.toContain("runtime-access-telemetry-secret");
      expect(observationJson).not.toContain("runtime-access-diagnostic-secret");
      assertNoLiveHandles(JSON.parse(observationJson));

      const finalizedCatalog = await boot.finalize();
      expect(providerEvents.slice(2)).toEqual(["release:email", "release:clock"]);
      expect(effectRuntime.runs).toHaveLength(5);
      expect(JSON.stringify(finalizedCatalog)).not.toContain("scenario-secret");
      assertNoLiveHandles(finalizedCatalog);
    } finally {
      await runtime.dispose();
    }
  });
});
