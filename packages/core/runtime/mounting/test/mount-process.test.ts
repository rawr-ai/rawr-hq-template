import { expect, test } from "bun:test";
import type { RuntimeObservationRecord } from "../../definition/src/index";
import type {
  HarnessDescriptor,
  HarnessHealthKind,
  HarnessHealthReport,
  HarnessMountInput,
  NativeHarnessHandle,
} from "../../harnesses/src/index";
import { createOwnerStop } from "../../harnesses/src/native-contract";
import type { MountReadySurfaceRuntimeRecord } from "../../process-runtime/src/index";
import { createMountingFixture } from "../../process-runtime/test/mounting-fixture";
import { type MountedProcess, mountProcess, validateFinalizationPolicy } from "../src/index";

type Payload = MountReadySurfaceRuntimeRecord<string>;
const policy = { policy: "waitForNativeStop", deadlineMs: 10_000 } as const;
const noopPort = { publish() {} };
const deferred = () => Promise.withResolvers<void>();
function descriptor(
  id: string,
  mount: (input: HarnessMountInput<Payload>) => Promise<NativeHarnessHandle> = async () => ({
    stop: createOwnerStop(() => {}),
  })
): HarnessDescriptor<Payload> {
  return { id, roles: ["agent"], surfaces: ["agent/tools"], mount };
}
function report(
  input: HarnessMountInput<Payload>,
  id: string,
  kind: HarnessHealthKind,
  status: HarnessHealthReport["status"]
): HarnessHealthReport {
  return { launchIdentity: input.launchIdentity, harnessId: id, kind, status, findings: [] };
}

test("mount consumes the real exact handoff, preserves payload references and publishes only after success", async () => {
  const fixture = createMountingFixture();
  const events: RuntimeObservationRecord[] = [];
  let probes = 0;
  const harnesses = ["first", "second"].map((id) =>
    descriptor(id, async (input) => {
      fixture.trace.push(`mount:${id}`);
      expect(input.launchIdentity).toBe(fixture.ready.identity);
      expect(input.roles).toBe(fixture.ready.roles);
      expect(input.processAccess).toBe(fixture.ready.processAccess);
      const selected = fixture.ready.records.find((record) => record.harnessId === id);
      if (selected === undefined) throw new Error("Fixture requires its selected surface.");
      expect(input.mountReadyPayloads[0]).toBe(selected);
      input.reports.report(report(input, id, "readiness", "passing"));
      expect(events.filter((event) => event.kind === "harness.mounted")).toHaveLength(
        id === "first" ? 0 : 1
      );
      return {
        stop: createOwnerStop(() => {
          fixture.trace.push(`stop:${id}`);
        }),
        readiness: async () => {
          probes++;
          return report(input, id, "readiness", "passing");
        },
      };
    })
  );
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses,
    finalization: policy,
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  });
  expect(fixture.bodies()).toBe(0);
  expect(probes).toBe(0);
  expect(runtime.identity).toBe(fixture.ready.identity);
  expect(Object.keys(runtime).sort()).toEqual([
    "finalization",
    "health",
    "identity",
    "roles",
    "stop",
  ]);
  expect(events.map((event) => event.kind)).toEqual([
    "harness.mounted",
    "harness.health",
    "harness.mounted",
    "harness.health",
    "process.started",
  ]);
  expect((await runtime.health("readiness")).status).toBe("passing");
  expect(probes).toBe(2);
  await runtime.stop();
  expect(fixture.trace).toEqual([
    "mount:first",
    "mount:second",
    "process.close",
    "stop:second",
    "stop:first",
    "process.stop",
  ]);
  expect(runtime.finalization().state).toBe("settled");
});

test("foreign handoffs never acquire cleanup authority; selected preflight refusals close their consumed process", async () => {
  const foreign = createMountingFixture();
  await expect(
    mountProcess({
      process: { ...foreign.ready },
      harnesses: [],
      finalization: policy,
      observation: noopPort,
    })
  ).rejects.toBeInstanceOf(TypeError);
  expect(foreign.trace).toEqual([]);
  await foreign.ready.stop();
  const own = createMountingFixture();
  let mounts = 0;
  const first = descriptor("first", async () => {
    mounts++;
    return { stop: createOwnerStop(() => {}) };
  });
  await expect(
    mountProcess({
      process: own.ready,
      harnesses: [first],
      finalization: policy,
      observation: noopPort,
    })
  ).rejects.toBeInstanceOf(TypeError);
  expect(mounts).toBe(0);
  expect(own.trace).toEqual(["process.close", "process.stop"]);
  await expect(
    mountProcess({
      process: own.ready,
      harnesses: [first, descriptor("second")],
      finalization: policy,
      observation: noopPort,
    })
  ).rejects.toBeInstanceOf(TypeError);
  expect(own.trace).toEqual(["process.close", "process.stop"]);
});

test("required provider health refuses before any native mount and releases the consumed process", async () => {
  const fixture = createMountingFixture({ requiredHealth: true });
  let calls = 0;
  const harnesses = ["first", "second"].map((id) =>
    descriptor(id, async () => {
      calls++;
      return { stop: createOwnerStop(() => {}) };
    })
  );
  await expect(
    mountProcess({ process: fixture.ready, harnesses, finalization: policy, observation: noopPort })
  ).rejects.toBeInstanceOf(TypeError);
  expect(calls).toBe(0);
  expect(fixture.trace).toEqual(["process.close", "process.stop"]);
});

test("capability supersets stay reusable, but mismatched surfaces refuse before native mutation", async () => {
  const valid = createMountingFixture({ harnessIds: ["first"] });
  const broad = { ...descriptor("first"), roles: ["agent", "desktop"] as const };
  const runtime = await mountProcess({
    process: valid.ready,
    harnesses: [broad],
    finalization: policy,
    observation: noopPort,
  });
  expect(runtime.roles).toEqual(["agent"]);
  await runtime.stop();
  const invalid = createMountingFixture({ harnessIds: ["first"] });
  await expect(
    mountProcess({
      process: invalid.ready,
      harnesses: [{ ...descriptor("first"), surfaces: ["desktop/background"] }],
      finalization: policy,
      observation: noopPort,
    })
  ).rejects.toBeInstanceOf(TypeError);
  expect(invalid.trace).toEqual(["process.close", "process.stop"]);
});

test("an earlier native mount cannot retarget a later selected descriptor after preflight", async () => {
  const fixture = createMountingFixture();
  let secondCalls = 0;
  const second = {
    ...descriptor("second", async () => {
      secondCalls++;
      return { stop: createOwnerStop(() => {}) };
    }),
  };
  const first = descriptor("first", async () => {
    second.id = "unselected";
    return {
      stop: createOwnerStop(() => {
        fixture.trace.push("stop:first");
      }),
    };
  });
  await expect(
    mountProcess({
      process: fixture.ready,
      harnesses: [first, second],
      finalization: policy,
      observation: noopPort,
    })
  ).rejects.toBeInstanceOf(TypeError);
  expect(secondCalls).toBe(0);
  expect(fixture.trace).toEqual(["process.close", "stop:first", "process.stop"]);
});

test("failed mount settles its partial cleanup, then reverses the prefix while preserving the original error", async () => {
  const partial = deferred();
  const beganPartial = deferred();
  const prefix = deferred();
  const beganPrefix = deferred();
  const mountFailure = new Error("original native mount failure");
  const fixture = createMountingFixture({
    stop: () => {
      throw new Error("process cleanup failure");
    },
  });
  const events: RuntimeObservationRecord[] = [];
  const first = descriptor("first", async () => ({
    stop: createOwnerStop(async () => {
      fixture.trace.push("stop:first");
      beganPrefix.resolve();
      await prefix.promise;
      throw new Error("prefix cleanup failure");
    }),
  }));
  const second = descriptor("second", async (input) => {
    input.reports.report(report(input, "second", "readiness", "passing"));
    beganPartial.resolve();
    await partial.promise;
    throw mountFailure;
  });
  let settled = false;
  const result = mountProcess({
    process: fixture.ready,
    harnesses: [first, second],
    finalization: policy,
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  }).catch((error) => {
    settled = true;
    return error;
  });
  await beganPartial.promise;
  expect(fixture.trace).toEqual([]);
  expect(settled).toBe(false);
  partial.resolve();
  await beganPrefix.promise;
  expect(fixture.trace).toEqual(["process.close", "stop:first"]);
  expect(settled).toBe(false);
  prefix.resolve();
  expect(await result).toBe(mountFailure);
  expect(fixture.trace.at(-1)).toBe("process.stop");
  expect(
    events.filter((event) => event.kind === "harness.mounted").map((event) => event.payload)
  ).toEqual([expect.objectContaining({ harnessId: "first" })]);
  expect(events.some((event) => event.kind === "harness.health")).toBe(false);
});

test("one stop promise stays draining beyond its deadline and cannot release before native settlement", async () => {
  const gate = deferred();
  const stopping = deferred();
  const fixture = createMountingFixture();
  const events: RuntimeObservationRecord[] = [];
  const first = descriptor("first", async () => ({
    stop: createOwnerStop(() => {
      fixture.trace.push("stop:first");
    }),
  }));
  const second = descriptor("second", async () => ({
    stop: createOwnerStop(async () => {
      fixture.trace.push("stop:second");
      stopping.resolve();
      await gate.promise;
    }),
  }));
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [first, second],
    finalization: { policy: "waitForNativeStop", deadlineMs: 2 },
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  });
  const original = runtime.stop();
  expect(runtime.stop()).toBe(original);
  expect(fixture.isOpen()).toBe(false);
  expect(() => runtime.health("readiness")).toThrow(TypeError);
  await stopping.promise;
  await new Promise((resolve) => setTimeout(resolve, 15));
  expect(runtime.finalization()).toEqual({
    state: "draining",
    deadline: expect.any(Number),
    deadlineExceeded: true,
    pendingNativeStop: ["second", "first"],
  });
  expect(fixture.trace).toEqual(["process.close", "stop:second"]);
  expect(events.filter((event) => event.kind === "process.finalization.deadline")).toHaveLength(1);
  expect(events.some((event) => event.kind === "process.finalization.settled")).toBe(false);
  gate.resolve();
  await original;
  expect(runtime.stop()).toBe(original);
  expect(runtime.finalization()).toEqual({ state: "settled", deadlineExceeded: true });
  expect(fixture.trace).toEqual(["process.close", "stop:second", "stop:first", "process.stop"]);
});

test("normal stop retains its first exact rejection only after every owner has settled", async () => {
  const firstFailure = new Error("second native stop failure");
  const fixture = createMountingFixture({
    stop: () => {
      throw new Error("process stop failure");
    },
  });
  const harnesses = ["first", "second"].map((id) =>
    descriptor(id, async () => ({
      stop: createOwnerStop(() => {
        fixture.trace.push(`stop:${id}`);
        throw id === "second" ? firstFailure : new Error("first native stop failure");
      }),
    }))
  );
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses,
    finalization: policy,
    observation: noopPort,
  });
  const operation = runtime.stop();
  expect(runtime.stop()).toBe(operation);
  await expect(operation).rejects.toBe(firstFailure);
  expect(runtime.stop()).toBe(operation);
  expect(fixture.trace).toEqual(["process.close", "stop:second", "stop:first", "process.stop"]);
  expect(runtime.finalization().state).toBe("settled");
});

test("a throwing optional health getter cannot escape custody of its successful native stop", async () => {
  const nativeStop = deferred();
  const stopping = deferred();
  const fixture = createMountingFixture({ harnessIds: ["first"] });
  const original = new Error("optional native health property failed");
  const events: RuntimeObservationRecord[] = [];
  const host = descriptor("first", async (input) => ({
    stop: createOwnerStop(async () => {
      fixture.trace.push("stop:first");
      stopping.resolve();
      await nativeStop.promise;
    }),
    get readiness(): NativeHarnessHandle["readiness"] {
      input.reports.report(report(input, "first", "readiness", "passing"));
      throw original;
    },
  }));
  let settled = false;
  const result = mountProcess({
    process: fixture.ready,
    harnesses: [host],
    finalization: policy,
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  }).catch((error) => {
    settled = true;
    return error;
  });
  await stopping.promise;
  expect(settled).toBe(false);
  expect(fixture.trace).toEqual(["process.close", "stop:first"]);
  expect(
    events.some((event) => event.kind === "harness.mounted" || event.kind === "harness.health")
  ).toBe(false);
  nativeStop.resolve();
  expect(await result).toBe(original);
  expect(fixture.trace).toEqual(["process.close", "stop:first", "process.stop"]);
});

test("no-op health is explicit and neutral, never inferred from a missing probe or an empty handle", async () => {
  const fixture = createMountingFixture({ harnessIds: ["noop"], empty: true });
  let calls = 0;
  const noOp = descriptor("noop", async (input) => {
    expect(input.mountReadyPayloads).toEqual([]);
    input.reports.report(report(input, "noop", "readiness", "not-applicable"));
    input.reports.report(report(input, "noop", "liveness", "not-applicable"));
    return {
      stop: createOwnerStop(() => {
        calls++;
      }),
    };
  });
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [noOp],
    finalization: policy,
    observation: noopPort,
  });
  expect((await runtime.health("readiness")).status).toBe("not-applicable");
  expect((await runtime.health("liveness")).status).toBe("not-applicable");
  await runtime.stop();
  expect(calls).toBe(1);
  const missing = createMountingFixture({ harnessIds: ["noop"], empty: true });
  const unknown = await mountProcess({
    process: missing.ready,
    harnesses: [descriptor("noop")],
    finalization: policy,
    observation: noopPort,
  });
  expect((await unknown.health("readiness")).status).toBe("unknown");
  await unknown.stop();
});

test.each([
  "reject",
  "mismatch",
  "error-finding",
] as const)("%s readiness evidence never inherits passing liveness", async (mode) => {
  const fixture = createMountingFixture({ harnessIds: ["first"] });
  const secret = "private native probe error";
  const events: RuntimeObservationRecord[] = [];
  const host = descriptor("first", async (input) => ({
    stop: createOwnerStop(() => {}),
    liveness: async () => report(input, "first", "liveness", "passing"),
    readiness: async () => {
      if (mode === "reject") throw new Error(secret);
      const value = report(
        input,
        mode === "mismatch" ? "foreign" : "first",
        "readiness",
        "passing"
      );
      return mode === "error-finding"
        ? { ...value, findings: [{ code: "failed", message: secret, severity: "error" as const }] }
        : value;
    },
  }));
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [host],
    finalization: policy,
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  });
  expect((await runtime.health("liveness")).status).toBe("passing");
  expect((await runtime.health("readiness")).status).toBe("unknown");
  expect(JSON.stringify(events)).not.toContain(secret);
  await runtime.stop();
});

test("mismatched reports during mount are refused before publication without failing native startup", async () => {
  const fixture = createMountingFixture({ harnessIds: ["first"] });
  const events: RuntimeObservationRecord[] = [];
  const host = descriptor("first", async (input) => {
    input.reports.report({
      ...report(input, "first", "readiness", "passing"),
      launchIdentity: { ...input.launchIdentity },
    });
    input.reports.report(report(input, "foreign", "liveness", "passing"));
    return { stop: createOwnerStop(() => {}) };
  });
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [host],
    finalization: policy,
    observation: {
      publish: (event) => {
        events.push(event);
      },
    },
  });
  expect(events.map((event) => event.kind)).toEqual(["harness.mounted", "process.started"]);
  expect((await runtime.health("readiness")).status).toBe("unknown");
  await runtime.stop();
});

test("a query cannot begin later probes after an earlier probe synchronously starts finalization", async () => {
  const fixture = createMountingFixture();
  let runtime: MountedProcess;
  let secondProbes = 0;
  const first = descriptor("first", async (input) => ({
    stop: createOwnerStop(() => {}),
    readiness: async () => {
      void runtime.stop();
      return report(input, "first", "readiness", "passing");
    },
  }));
  const second = descriptor("second", async (input) => ({
    stop: createOwnerStop(() => {}),
    readiness: async () => {
      secondProbes++;
      return report(input, "second", "readiness", "passing");
    },
  }));
  runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [first, second],
    finalization: policy,
    observation: noopPort,
  });
  expect((await runtime.health("readiness")).status).toBe("failing");
  expect(secondProbes).toBe(0);
  await runtime.stop();
});

test("native stop includes an existing probe and its cleanup without a separate mounting probe queue", async () => {
  const probe = deferred();
  const cleanup = deferred();
  const stopped = deferred();
  const fixture = createMountingFixture({ harnessIds: ["first"] });
  let probeCalls = 0;
  const host = descriptor("first", async (input) => ({
    readiness: async () => {
      probeCalls++;
      await probe.promise;
      return report(input, "first", "readiness", "passing");
    },
    stop: createOwnerStop(async () => {
      stopped.resolve();
      await probe.promise;
      await cleanup.promise;
    }),
  }));
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [host],
    finalization: policy,
    observation: noopPort,
  });
  const health = runtime.health("readiness");
  const stop = runtime.stop();
  await stopped.promise;
  expect(() => runtime.health("readiness")).toThrow(TypeError);
  expect(probeCalls).toBe(1);
  expect(fixture.trace).toEqual(["process.close"]);
  probe.resolve();
  expect((await health).status).toBe("failing");
  expect(fixture.trace).toEqual(["process.close"]);
  cleanup.resolve();
  await stop;
  expect(fixture.trace).toEqual(["process.close", "process.stop"]);
});

test.each([
  "sync",
  "async",
  "pending",
] as const)("%s observation I/O cannot change native ownership or outcomes", async (mode) => {
  const fixture = createMountingFixture({ harnessIds: ["first"] });
  const pending = deferred();
  const original = new Error("original stop failure");
  const host = descriptor("first", async () => ({
    stop: createOwnerStop(() => {
      throw original;
    }),
  }));
  const runtime = await mountProcess({
    process: fixture.ready,
    harnesses: [host],
    finalization: policy,
    observation: {
      publish() {
        if (mode === "sync") throw new Error("observation failure");
        if (mode === "async") return Promise.reject(new Error("observation failure"));
        return pending.promise;
      },
    },
  });
  await expect(runtime.stop()).rejects.toBe(original);
  expect(fixture.trace).toEqual(["process.close", "process.stop"]);
  pending.resolve();
});

test("explicit finalization policy admits zero and refuses invalid or implicit timer values", () => {
  expect(validateFinalizationPolicy({ policy: "waitForNativeStop", deadlineMs: 0 })).toEqual({
    policy: "waitForNativeStop",
    deadlineMs: 0,
  });
  expect(Object.isFrozen(validateFinalizationPolicy(policy))).toBe(true);
  for (const input of [
    undefined,
    {},
    { policy: "force", deadlineMs: 1 },
    ...[-1, NaN, Infinity, 0.5, 2_147_483_648].map((deadlineMs) => ({
      policy: "waitForNativeStop",
      deadlineMs,
    })),
  ]) {
    expect(() => validateFinalizationPolicy(input)).toThrow(TypeError);
  }
});
