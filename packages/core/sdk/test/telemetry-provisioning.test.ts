import { once } from "node:events";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { Effect } from "effect";
import { expect, test } from "vitest";
import type { FlushTelemetryInput } from "../../../../resources/telemetry/contract";
import { decodeOpenTelemetryNodeConfig } from "../../../../resources/telemetry/providers/opentelemetry-node/index";
import { defineOpenTelemetryNodeRuntimeProvider } from "../../../../resources/telemetry/providers/opentelemetry-node/runtime";
import { TelemetryRuntimeResource } from "../../../../resources/telemetry/runtime";
import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../runtime/compiler/src/index";
import {
  defineApp,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  providerFx,
  providerSelection,
  requireResource,
  runtimeLaunchIdentity,
} from "../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../runtime/derivation/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";

async function receiveOtlp() {
  const requests: { readonly path: string; readonly body: string }[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      requests.push({ path: request.url ?? "", body: Buffer.concat(chunks).toString("utf8") });
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{}");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing OTLP listener");
  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
        server.closeIdleConnections();
      }),
  };
}

function configuration(endpoint: string, enabled = true) {
  const processIdentity = {
    serviceName: "sdk-substrate-proof",
    processRole: "cohost",
    processInstanceId: `sdk-${process.pid}`,
  };
  const exporter = (signal: string) => ({
    url: `${endpoint}/v1/${signal}`,
    headers: {},
    timeoutMilliseconds: 500,
  });
  return decodeOpenTelemetryNodeConfig(
    enabled
      ? {
          enabled,
          processIdentity,
          defaultAttributes: {},
          exportedAttributePaths: [],
          traces: exporter("traces"),
          metrics: exporter("metrics"),
          logs: exporter("logs"),
          metricExportIntervalMilliseconds: 1_000,
          constructionCleanupTimeoutMilliseconds: 500,
        }
      : { enabled, processIdentity }
  );
}

/** Only compiled artifacts, exact requirement references and counters leave authoring. */
function produceTelemetryFixture(releaseDeadline: () => FlushTelemetryInput, failAfter = false) {
  const serverRequirement = requireResource({
    resource: TelemetryRuntimeResource,
    reason: "server technical telemetry",
  });
  const asyncRequirement = requireResource({
    resource: TelemetryRuntimeResource,
    reason: "async technical telemetry",
  });
  const provider = defineOpenTelemetryNodeRuntimeProvider({ releaseDeadline });
  const laterResource = defineRuntimeResource<"later-provider", void>({
    id: "later-provider",
    title: "Later provider",
    purpose: "Real telemetry rollback discriminator",
  });
  const laterRequirement = requireResource({ resource: laterResource, reason: "rollback proof" });
  const calls = { laterAcquire: 0, laterRelease: 0 };
  const laterProvider = defineRuntimeProvider({
    id: "later-provider.native",
    title: "Later provider",
    provides: laterResource,
    requires: [serverRequirement],
    build: ({ resources }) => {
      const telemetry = resources.get(serverRequirement);
      return providerFx.acquireRelease({
        acquire: Effect.gen(function* () {
          calls.laterAcquire++;
          yield* telemetry.emitTechnicalLog({
            severity: "info",
            eventName: "sdk.rollback",
            message: "Telemetry acquired before a later startup failure",
            attributes: {},
          });
          return yield* Effect.fail("later provider failed");
        }),
        release: () =>
          Effect.sync(() => {
            calls.laterRelease++;
          }),
      });
    },
  });
  const server = definePlugin({
    id: "server",
    role: "server",
    surface: "server/api",
    capability: "telemetry",
    services: {},
    resourceRequirements: failAfter ? [serverRequirement, laterRequirement] : [serverRequirement],
    project: () => ({ kind: "plugin.projection", facts: {} }),
  });
  const asyncPlugin = definePlugin({
    id: "async",
    role: "async",
    surface: "async/workflow",
    capability: "telemetry",
    services: {},
    resourceRequirements: [asyncRequirement],
    project: () => ({ kind: "plugin.projection", facts: {} }),
  });
  const app = defineApp({ id: "telemetry-proof", plugins: [server, asyncPlugin] });
  const profile = defineRuntimeProfile({
    id: "telemetry-profile",
    configSources: [{ kind: "test" }],
    providers: [
      providerSelection({
        resource: TelemetryRuntimeResource,
        provider,
        config: { kind: "runtime.config", key: "telemetry" },
      }),
      ...(failAfter
        ? [providerSelection({ resource: laterResource, provider: laterProvider })]
        : []),
    ],
  });
  const processDefinition = defineProcessCatalog({
    cohost: { id: "cohost", roles: ["server", "async"] },
  }).cohost;
  const entrypoint = defineEntrypoint({
    id: "cohost",
    app,
    profile,
    process: processDefinition,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: processDefinition.id,
      entrypoint: "cohost",
      deployment: "test",
      source: "sdk-telemetry-proof",
    }),
  });
  const compilation = compileRuntimePlan({
    derivation: deriveRuntimeArtifacts({ entrypoint, profileId: profile.id }),
  });
  return {
    compilation,
    bootgraph: orderBootgraph(compilation.plan.bootgraphInput),
    serverRequirement,
    asyncRequirement,
    calls,
  };
}

test("compiled native telemetry is cold, shared by cohost roles, exported and released once", async () => {
  const receiver = await receiveOtlp();
  let deadlineCalls = 0;
  const fixture = produceTelemetryFixture(() => {
    deadlineCalls++;
    return { deadlineMonotonicMilliseconds: performance.now() + 2_000 };
  });
  const sources = { appRoot: tmpdir(), test: { telemetry: configuration(receiver.endpoint) } };
  expect(deadlineCalls).toBe(0);
  expect(receiver.requests).toEqual([]);
  expect(fixture.bootgraph.modules).toHaveLength(1);
  const ready = await provisionProcess({ ...fixture, sources });
  try {
    const telemetry = ready.processResources.get(fixture.serverRequirement);
    expect(telemetry.availability).toBe("available");
    expect(ready.roleResources.server!.get(fixture.serverRequirement)).toBe(telemetry);
    expect(ready.roleResources.async!.get(fixture.asyncRequirement)).toBe(telemetry);
    expect(ready.processResources.has({ ...fixture.serverRequirement })).toBe(false);
    expect(Object.keys(telemetry)).not.toContain("release");
    expect(deadlineCalls).toBe(0);

    const duplicate = await provisionProcess({ ...fixture, sources });
    try {
      expect(duplicate.processResources.get(fixture.serverRequirement).availability).toBe(
        "degraded"
      );
    } finally {
      await duplicate.managedRuntime.dispose();
    }
    expect(deadlineCalls).toBe(1);
    await ready.managedRuntime.run(
      telemetry.emitTechnicalLog({
        severity: "info",
        eventName: "sdk.telemetry",
        message: "Native telemetry reached the real provisioning pipeline",
        attributes: {},
      })
    );
    await ready.managedRuntime.dispose();
    await ready.managedRuntime.dispose();
    expect(deadlineCalls).toBe(2);
    expect(await Effect.runPromise(telemetry.readDiagnostics())).toEqual([]);
    expect(
      receiver.requests.some(
        ({ path, body }) => path === "/v1/logs" && body.includes("sdk.telemetry")
      ),
      JSON.stringify(receiver.requests)
    ).toBe(true);

    const reacquired = await provisionProcess({ ...fixture, sources });
    try {
      expect(reacquired.processResources.get(fixture.serverRequirement).availability).toBe(
        "available"
      );
    } finally {
      await reacquired.managedRuntime.dispose();
    }
    expect(deadlineCalls).toBe(3);
  } finally {
    await ready.managedRuntime.dispose();
    await receiver.close();
  }
});

test("a later native acquisition failure rolls telemetry back and permits fresh acquisition", async () => {
  const receiver = await receiveOtlp();
  let deadlineCalls = 0;
  const deadline = () => {
    deadlineCalls++;
    return { deadlineMonotonicMilliseconds: performance.now() + 2_000 };
  };
  const fixture = produceTelemetryFixture(deadline, true);
  const sources = { appRoot: tmpdir(), test: { telemetry: configuration(receiver.endpoint) } };
  try {
    await expect(provisionProcess({ ...fixture, sources })).rejects.toBeDefined();
    expect(fixture.calls).toEqual({ laterAcquire: 1, laterRelease: 0 });
    expect(deadlineCalls).toBe(1);
    expect(
      receiver.requests.some(
        ({ path, body }) => path === "/v1/logs" && body.includes("sdk.rollback")
      ),
      JSON.stringify(receiver.requests)
    ).toBe(true);
    const next = produceTelemetryFixture(deadline);
    const ready = await provisionProcess({ ...next, sources });
    try {
      expect(ready.processResources.get(next.serverRequirement).availability).toBe("available");
    } finally {
      await ready.managedRuntime.dispose();
    }
    expect(deadlineCalls).toBe(2);
  } finally {
    await receiver.close();
  }
});

test("disabled telemetry stays inert through the same real pipeline", async () => {
  const receiver = await receiveOtlp();
  let deadlineCalls = 0;
  const fixture = produceTelemetryFixture(() => {
    deadlineCalls++;
    return { deadlineMonotonicMilliseconds: performance.now() + 2_000 };
  });
  try {
    const ready = await provisionProcess({
      ...fixture,
      sources: { appRoot: tmpdir(), test: { telemetry: configuration(receiver.endpoint, false) } },
    });
    try {
      const telemetry = ready.processResources.get(fixture.serverRequirement);
      expect(telemetry.availability).toBe("disabled");
      expect(deadlineCalls).toBe(0);
      await ready.managedRuntime.run(
        telemetry.emitTechnicalLog({
          severity: "info",
          eventName: "sdk.disabled",
          message: "Disabled",
          attributes: {},
        })
      );
    } finally {
      await ready.managedRuntime.dispose();
      await ready.managedRuntime.dispose();
    }
    expect(deadlineCalls).toBe(1);
    expect(receiver.requests).toEqual([]);
  } finally {
    await receiver.close();
  }
});
