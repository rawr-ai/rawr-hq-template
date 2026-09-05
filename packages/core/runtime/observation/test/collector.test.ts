import { expect, test } from "bun:test";
import type { RuntimeObservationRecord } from "../../definition/src/index";
import {
  createRuntimeObservation,
  type RuntimeObservationSeed,
  type RuntimeTelemetryRecord,
} from "../src/index";

function seed(): RuntimeObservationSeed {
  return {
    identity: {
      app: "app",
      process: "process",
      entrypoint: "main",
      deployment: "test",
      source: "test",
    },
    profileId: "profile",
    roles: ["cli"],
    derivedAuthoring: { pluginOwnerIds: ["plugin"], serviceIds: ["service"] },
    resources: [
      { requirementId: "required", resourceId: "resource", optional: false, lifetime: "process" },
    ],
    providers: [
      {
        selectionId: "selected",
        providerId: "provider",
        resourceId: "resource",
        requirementIds: ["required"],
      },
    ],
    providerDependencyGraph: {
      nodes: ["selected"],
      edges: [],
      closure: [{ selectionId: "selected", reachableSelectionIds: [] }],
    },
    plugins: [
      { pluginOwnerId: "plugin", role: "cli", surface: "cli/commands", capability: "commands" },
    ],
    serviceAttachments: [
      { bindingId: "binding", serviceId: "service", role: "cli", dependencyBindingIds: [] },
    ],
    workflowDispatchers: [],
    executionPlans: [{ executionId: "execution", ownerId: "plugin", boundary: "plugin.command" }],
    executionRegistry: { executionIds: ["execution"] },
    surfaces: [
      {
        surfacePlanId: "surface",
        pluginOwnerId: "plugin",
        role: "cli",
        surface: "cli/commands",
        capability: "commands",
        bindingIds: ["binding"],
        executionIds: ["execution"],
      },
    ],
    harnesses: [{ harnessId: "host" }],
  };
}
function release(
  payload: unknown = {
    selectionId: "selected",
    providerId: "provider",
    typedFailure: true,
    defect: true,
    interrupted: true,
  }
): RuntimeObservationRecord {
  return {
    phase: "provisioning",
    boundary: "provider.release",
    kind: "provider.release.failed",
    correlationId: "process",
    payload,
  };
}

test("detaches complete selected topology without inventing future lifecycle evidence", () => {
  const input = seed();
  const observer = createRuntimeObservation({ seed: input });
  const snapshot = observer.snapshot();
  expect(Object.keys(snapshot).sort()).toEqual(
    [
      "processIdentity",
      "appIdentity",
      "entrypointIdentity",
      "roles",
      "derivedAuthoring",
      "resources",
      "providers",
      "providerDependencyGraph",
      "plugins",
      "serviceAttachments",
      "workflowDispatchers",
      "executionPlans",
      "executionRegistry",
      "surfaces",
      "harnesses",
      "lifecycleTimestamps",
      "lifecycleStatus",
      "diagnostics",
      "topologyRecords",
      "startupRecords",
      "executionRecords",
      "finalizationRecords",
      "retention",
    ].sort()
  );
  expect(snapshot.providers[0]?.releaseStatus).toBe("unobserved");
  expect(snapshot.executionRegistry.status).toBe("unobserved");
  expect(snapshot.executionRecords).toEqual([]);
  expect(snapshot.workflowDispatchers).toEqual([]);
  expect(snapshot.surfaces).toHaveLength(1);
  expect(Object.isFrozen(snapshot.surfaces[0])).toBe(true);
  expect(snapshot.surfaces === input.surfaces).toBe(false);
  Object.assign(input.identity, { process: "changed" });
  expect(observer.snapshot().processIdentity.id).toBe("process");
  expect(observer.snapshot() === snapshot).toBe(false);
});

test("projects overlapping native release failure flags without inferring completion", () => {
  const observer = createRuntimeObservation({ seed: seed() });
  observer.port.publish(release());
  const snapshot = observer.snapshot();
  expect(snapshot.finalizationRecords[0]).toEqual({
    kind: "provider.release.failed",
    selectionId: "selected",
    providerId: "provider",
    typedFailure: true,
    defect: true,
    interrupted: true,
  });
  expect(snapshot.providers[0]?.releaseStatus).toBe("failed");
  expect(snapshot.lifecycleStatus.finalization).toBe("failure-observed");
  expect(snapshot.lifecycleStatus.provisioning).toBe("unobserved");
});

test("unknown, malformed, foreign and secret-bearing records retain no arbitrary input", () => {
  const observer = createRuntimeObservation({ seed: seed() });
  let inspected = 0;
  const dangerous = {
    get secret() {
      inspected++;
      throw new Error("secret");
    },
  };
  observer.port.publish({ ...release(), kind: "custom.secret", payload: dangerous });
  observer.port.publish(
    release({
      selectionId: "selected",
      providerId: "provider",
      typedFailure: true,
      defect: false,
      interrupted: false,
      secret: "token",
    })
  );
  observer.port.publish({ ...release(), correlationId: "foreign" });
  observer.port.publish(
    release({
      selectionId: "foreign",
      providerId: "provider",
      typedFailure: true,
      defect: false,
      interrupted: false,
    })
  );
  observer.port.publish(release(dangerous));
  expect(inspected).toBe(0);
  const snapshot = observer.snapshot();
  expect(snapshot.diagnostics).toHaveLength(5);
  for (const diagnostic of snapshot.diagnostics) {
    expect(diagnostic.code).toBe("observation.unsupported");
    expect(Object.hasOwn(diagnostic, "payload")).toBe(false);
  }
  expect(snapshot.finalizationRecords).toEqual([]);
  expect(JSON.stringify(snapshot)).not.toContain("token");
});

test("bounded histories expose dropped count while selected status survives eviction", () => {
  const observer = createRuntimeObservation({ seed: seed(), historyLimit: 2 });
  observer.port.publish(release());
  observer.port.publish({ ...release(), kind: "unknown" });
  observer.port.publish({ ...release(), kind: "unknown" });
  const snapshot = observer.snapshot();
  expect(snapshot.diagnostics).toHaveLength(2);
  expect(snapshot.finalizationRecords).toEqual([]);
  expect(snapshot.retention).toEqual({ limit: 2, dropped: 1 });
  expect(snapshot.providers[0]?.releaseStatus).toBe("failed");
  expect(createRuntimeObservation({ seed: seed() }).snapshot().diagnostics).toEqual([]);
});

test("an admitted large seed remains snapshot-able at full retention without identifier quotas", () => {
  const base = seed();
  const observer = createRuntimeObservation({
    seed: {
      ...base,
      identity: { ...base.identity, app: "a".repeat(1024) },
      resources: Array.from({ length: 15_000 }, (_, index) => ({
        requirementId: `r${index}`,
        resourceId: "resource",
        optional: true,
        lifetime: "process" as const,
      })),
    },
    historyLimit: 20,
  });
  for (let index = 0; index < 20; index++) observer.port.publish(release());
  const snapshot = observer.snapshot();
  expect(snapshot.resources).toHaveLength(15_000);
  expect(snapshot.appIdentity.id).toHaveLength(1024);
  expect(snapshot.diagnostics).toHaveLength(20);
  expect(snapshot.retention.dropped).toBe(0);
});

test("seed rejects secrets, live values, accessors, cycles and invalid retention", () => {
  expect(() =>
    createRuntimeObservation({ seed: { ...seed(), config: "secret" } as RuntimeObservationSeed })
  ).toThrow(TypeError);
  const getter = seed();
  Object.defineProperty(getter, "roles", {
    get() {
      throw new Error("must not run");
    },
  });
  expect(() => createRuntimeObservation({ seed: getter })).toThrow();
  const cyclic = seed();
  Object.assign(cyclic, { cyclic });
  expect(() => createRuntimeObservation({ seed: cyclic })).toThrow(TypeError);
  expect(() => createRuntimeObservation({ seed: seed(), historyLimit: 0 })).toThrow(TypeError);
});

test("telemetry sink failures never rerun callbacks or replace results and thrown identity", async () => {
  for (const publish of [
    () => {
      throw new Error("sync sink");
    },
    async () => {
      throw new Error("async sink");
    },
  ]) {
    const observer = createRuntimeObservation({ seed: seed(), sink: { publish } });
    let calls = 0;
    const product = { secret: "product" };
    const input = { name: "work", phase: "mounting" as const, boundary: "harness" as const };
    expect(
      await observer.telemetry.span(input, async () => {
        calls++;
        return product;
      })
    ).toBe(product);
    const failure = new Error("private product failure");
    expect(
      await observer.telemetry
        .span(input, async () => {
          calls++;
          throw failure;
        })
        .catch((error) => error)
    ).toBe(failure);
    expect(calls).toBe(2);
    observer.telemetry.event("secret", { token: "secret" });
    observer.telemetry.annotate({ key: "secret", value: "secret" });
    await Promise.resolve();
  }
  const events: RuntimeTelemetryRecord[] = [];
  const observer = createRuntimeObservation({
    seed: seed(),
    sink: {
      publish(record) {
        events.push(record);
      },
    },
  });
  await observer.telemetry.span(
    { name: "secret", phase: "mounting", boundary: "harness", attributes: { token: "secret" } },
    async () => "secret result"
  );
  expect(events.map((event) => event.kind)).toEqual(["span.started", "span.settled"]);
  expect(events[0]?.attributes).toEqual({ token: "secret" });
  expect(JSON.stringify(events)).not.toContain("secret result");
});

test("telemetry preserves authored metadata, detaches values and pairs concurrent spans", async () => {
  const events: RuntimeTelemetryRecord[] = [];
  const observer = createRuntimeObservation({
    seed: seed(),
    sink: {
      publish(record) {
        events.push(record);
      },
    },
  });
  const gate = Promise.withResolvers<void>();
  const input = {
    name: "first",
    phase: "mounting" as const,
    boundary: "harness" as const,
    attributes: { count: 1, nested: [true, null] },
  };
  const first = observer.telemetry.span(input, () => gate.promise);
  input.attributes.count = 2;
  await observer.telemetry.span(
    { name: "second", phase: "provisioning", boundary: "provider" },
    async () => "result"
  );
  gate.resolve();
  await first;
  expect(events[0]?.spanId).toBe(events[3]?.spanId);
  expect(events[1]?.spanId).toBe(events[2]?.spanId);
  expect(events[0]?.spanId).not.toBe(events[1]?.spanId);
  expect(events[0]?.attributes).toEqual({ count: 1, nested: [true, null] });
  expect(events[3]?.name).toBe("first");
  expect(events[3]?.phase).toBe("mounting");
  expect(events[3]?.boundary).toBe("harness");
  const payload = { count: 3 };
  observer.telemetry.event("work.completed", payload);
  payload.count = 4;
  expect(events[4]?.payload).toEqual({ count: 3 });
  observer.telemetry.annotate({ key: "tenant", value: { id: "public" } });
  expect(events[5]?.value).toEqual({ id: "public" });
  observer.telemetry.annotate({ key: "token", value: "secret", redaction: "omitted" });
  expect(events[6]?.key).toBe("token");
  expect(events[6]?.dataStatus).toBe("omitted");
  expect(Object.hasOwn(events[6]!, "value")).toBe(false);
  expect(Object.isFrozen(events[4]?.payload)).toBe(true);
});

test("invalid telemetry is explicitly omitted without blocking the product callback", async () => {
  const events: RuntimeTelemetryRecord[] = [];
  const observer = createRuntimeObservation({
    seed: seed(),
    sink: {
      publish(record) {
        events.push(record);
      },
    },
  });
  const cycle: Record<string, import("../src/index").RuntimeTelemetryPayload> = {};
  cycle.self = cycle;
  let calls = 0;
  const result = await observer.telemetry.span(
    { name: "cycle", phase: "mounting", boundary: "harness", attributes: cycle },
    async () => {
      calls++;
      return 42;
    }
  );
  expect(result).toBe(42);
  expect(calls).toBe(1);
  expect(events.map((record) => record.dataStatus)).toEqual(["omitted", "omitted"]);
  observer.telemetry.event("bad", Number.NaN);
  expect(events[2]?.dataStatus).toBe("omitted");
  let reads = 0;
  const annotation = {
    key: "hidden",
    redaction: "omitted" as const,
    get value(): never {
      reads++;
      throw new Error("must not inspect");
    },
  };
  observer.telemetry.annotate(annotation);
  expect(reads).toBe(0);
  expect(events[3]?.dataStatus).toBe("omitted");
});

test("a shared sink distinguishes full launch identity without global counters", () => {
  const events: RuntimeTelemetryRecord[] = [];
  const sink = {
    publish(record: RuntimeTelemetryRecord) {
      events.push(record);
    },
  };
  const firstSeed = seed();
  const secondSeed = {
    ...seed(),
    identity: {
      ...seed().identity,
      app: "other-app",
      deployment: "other-deployment",
      source: "other-source",
    },
  };
  const first = createRuntimeObservation({ seed: firstSeed, sink });
  const second = createRuntimeObservation({ seed: secondSeed, sink });
  Object.assign(secondSeed.identity, { source: "mutated" });
  first.port.publish(release());
  second.telemetry.event("test");
  expect(events[0]?.identity).toEqual(firstSeed.identity);
  expect(events[1]?.identity).toEqual({
    ...firstSeed.identity,
    app: "other-app",
    deployment: "other-deployment",
    source: "other-source",
  });
  expect(events.map((record) => record.processId)).toEqual(["process", "process"]);
  expect(events.map((record) => record.sequence)).toEqual([1, 1]);
  expect(Object.isFrozen(events[1]?.identity)).toBe(true);
  expect(events[0]?.name).toBe("provider.release.failed");
});

test("identical launch restarts have distinct paired spans and explicit undefined attributes stay absent", async () => {
  const events: RuntimeTelemetryRecord[] = [];
  const sink = {
    publish(record: RuntimeTelemetryRecord) {
      events.push(record);
    },
  };
  const first = createRuntimeObservation({ seed: seed(), sink });
  const second = createRuntimeObservation({ seed: seed(), sink });
  const gate = Promise.withResolvers<void>();
  const input = {
    name: "restart",
    phase: "mounting" as const,
    boundary: "harness" as const,
    attributes: undefined,
  };
  const pending = first.telemetry.span(input, () => gate.promise);
  await second.telemetry.span(input, async () => {});
  gate.resolve();
  await pending;
  expect(events[0]?.identity).toEqual(events[1]?.identity);
  expect(typeof events[0]?.spanId).toBe("string");
  expect(events[0]?.spanId).not.toBe(events[1]?.spanId);
  expect(events[0]?.spanId).toBe(events[3]?.spanId);
  expect(events[1]?.spanId).toBe(events[2]?.spanId);
  expect(events.map((record) => record.sequence)).toEqual([1, 1, 2, 2]);
  for (const record of events) {
    expect(record.name).toBe("restart");
    expect(record.phase).toBe("mounting");
    expect(record.boundary).toBe("harness");
    expect(record.dataStatus).toBe("included");
    expect(Object.hasOwn(record, "attributes")).toBe(false);
  }
});
