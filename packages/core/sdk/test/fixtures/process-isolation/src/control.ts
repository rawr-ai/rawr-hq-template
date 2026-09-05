import { fstatSync, readSync } from "node:fs";
import type { Entrypoint, RuntimeLaunchIdentity, StartedProcess } from "@habitat-ai/sdk/app";
import type { HarnessDescriptor, HarnessMountInput } from "@habitat-ai/sdk/runtime/harnesses";
import { Effect } from "effect";
import { type Static, Type } from "typebox";
import { Check } from "typebox/value";

const configSchema = Type.Object(
  {
    role: Type.Union([Type.Literal("server"), Type.Literal("async")]),
    port: Type.Integer({ minimum: 1, maximum: 65535 }),
    devServerUrl: Type.String({ minLength: 1 }),
    workspaceRoot: Type.String({ minLength: 1 }),
    deployment: Type.String({ minLength: 1 }),
    source: Type.String({ minLength: 1 }),
    incarnation: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);
const rawConfig: unknown = JSON.parse(process.env.HABITAT_ISOLATION_CONFIG ?? "null");
if (!Check(configSchema, rawConfig)) throw new TypeError("Invalid process isolation config.");
export const config = Object.freeze(rawConfig);

export const operationSchema = Type.Object(
  { key: Type.String({ minLength: 1 }), hold: Type.Boolean() },
  { additionalProperties: false }
);
type Operation = Static<typeof operationSchema>;
export interface FileLease {
  readonly token: string;
  readonly pid: number;
  readonly path: string;
  readonly fd: number;
}
export const state = {
  lease: null as FileLease | null,
  leaseOpen: false,
  nativeMountIdentity: null as RuntimeLaunchIdentity | null,
  events: [] as string[],
  counters: {
    leaseBuild: 0,
    leaseAcquire: 0,
    leaseRelease: 0,
    clientBuild: 0,
    clientAcquire: 0,
    clientRelease: 0,
    nativeMount: 0,
    nativeStop: 0,
    operationsStarted: 0,
    operationsCompleted: 0,
    operationsFinalized: 0,
    outerRuns: 0,
  },
};
const gates = new Map<string, { promise: Promise<void>; resolve(): void }>();

function assertLease(lease: FileLease): void {
  if (!state.leaseOpen || state.lease !== lease || !fstatSync(lease.fd).isFile())
    throw new Error("The invocation lost its own live file lease.");
  const bytes = Buffer.alloc(fstatSync(lease.fd).size);
  readSync(lease.fd, bytes, 0, bytes.length, 0);
  if (bytes.toString("utf8") !== lease.token) throw new Error("The file lease token changed.");
}

export function performOperation(lease: FileLease, input: Operation) {
  return Effect.gen(function* () {
    assertLease(lease);
    state.counters.operationsStarted++;
    if (input.hold) {
      if (gates.has(input.key)) throw new Error("Duplicate held fixture operation.");
      const gate = Promise.withResolvers<void>();
      gates.set(input.key, gate);
      yield* Effect.promise(() => gate.promise);
    }
    assertLease(lease);
    state.counters.operationsCompleted++;
    return { key: input.key, token: lease.token, pid: process.pid };
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        assertLease(lease);
        gates.delete(input.key);
        state.counters.operationsFinalized++;
      })
    )
  );
}

/** Observe the actual native owner without replacing its stop operation or health probes. */
export function observeHarness<T>(descriptor: HarnessDescriptor<T>): HarnessDescriptor<T> {
  return Object.freeze({
    ...descriptor,
    async mount(input: HarnessMountInput<T>) {
      state.nativeMountIdentity = input.launchIdentity;
      state.counters.nativeMount++;
      const native = await descriptor.mount(input);
      state.events.push("native-mounted");
      return Object.freeze({
        ...native,
        stop() {
          state.counters.nativeStop++;
          state.events.push("native-stop-started");
          const stopping = native.stop();
          void stopping.then(
            () => state.events.push("native-stopped"),
            () => state.events.push("native-stop-rejected")
          );
          return stopping;
        },
      });
    },
  });
}

const requestSchema = Type.Object(
  {
    id: Type.Integer({ minimum: 0 }),
    command: Type.Union(
      ["snapshot", "release", "stop", "health", "health-stop", "exit"].map((command) =>
        Type.Literal(command)
      )
    ),
    key: Type.Optional(Type.String()),
    kind: Type.Optional(Type.Union([Type.Literal("readiness"), Type.Literal("liveness")])),
  },
  { additionalProperties: false }
);

/** Child-local test IPC only. Production startup and every native operation remain SDK-owned. */
export async function exposeChild(
  entrypoint: Entrypoint,
  startup: Promise<StartedProcess>,
  address: string
): Promise<void> {
  let started: StartedProcess | undefined;
  let failed = false;
  let stopPromise: Promise<void> | undefined;
  const stop = { requested: false, samePromise: null as boolean | null, settled: false };
  const snapshot = () => {
    const catalog = started?.catalog() ?? null;
    let alive = false;
    if (state.lease !== null && state.leaseOpen) {
      try {
        assertLease(state.lease);
        alive = true;
      } catch {
        /* Evidence remains false. */
      }
    }
    return {
      role: config.role,
      pid: process.pid,
      incarnation: config.incarnation,
      identity: entrypoint.identity,
      startedIdentity: started?.identity ?? null,
      nativeMountIdentity: state.nativeMountIdentity,
      catalog,
      immutable: {
        entrypoint: Object.isFrozen(entrypoint),
        identity: Object.isFrozen(entrypoint.identity),
        started: started !== undefined && Object.isFrozen(started),
        startedIdentity: started !== undefined && Object.isFrozen(started.identity),
        nativeMountIdentity:
          state.nativeMountIdentity !== null && Object.isFrozen(state.nativeMountIdentity),
        catalog: catalog !== null && Object.isFrozen(catalog),
      },
      sameIdentity: {
        started: started?.identity === entrypoint.identity,
        nativeMount: state.nativeMountIdentity === entrypoint.identity,
      },
      lease: state.lease === null ? null : { ...state.lease, alive },
      events: [...state.events],
      counters: { ...state.counters },
      pendingKeys: [...gates.keys()].sort(),
      stop: { ...stop },
    };
  };
  function beginStop(): Promise<void> {
    if (started === undefined) throw new Error("The child has no started process.");
    stop.requested = true;
    const first = started.stop();
    const second = started.stop();
    stop.samePromise = first === second && (stopPromise === undefined || first === stopPromise);
    stopPromise = first;
    void first.then(
      () => {
        stop.settled = true;
      },
      () => {
        stop.settled = true;
      }
    );
    return first;
  }
  process.on("message", (message: unknown) => {
    if (!Check(requestSchema, message)) return;
    const respond = async () => {
      let value: unknown;
      switch (message.command) {
        case "snapshot":
          value = snapshot();
          break;
        case "release": {
          const gate = message.key === undefined ? undefined : gates.get(message.key);
          if (gate === undefined) throw new Error("No held operation has that key.");
          gate.resolve();
          value = { released: message.key };
          break;
        }
        case "stop":
          await beginStop();
          value = snapshot();
          break;
        case "health": {
          if (started === undefined) throw new Error("The child has no started process.");
          value = await started.health(message.kind ?? "readiness");
          break;
        }
        case "health-stop": {
          if (started === undefined) throw new Error("The child has no started process.");
          const readiness = started.health("readiness");
          const liveness = started.health("liveness");
          void beginStop().catch(() => {});
          let afterStopRefused = false;
          try {
            await started.health("readiness");
          } catch {
            afterStopRefused = true;
          }
          value = {
            readiness: await readiness,
            liveness: await liveness,
            afterStopRefused,
            samePromise: stop.samePromise,
          };
          break;
        }
        case "exit": {
          if (!failed && !stop.settled) throw new Error("Stop must settle before child exit.");
          process.send?.({ id: message.id, ok: true, value: null }, () => {
            process.exitCode = 0;
            process.disconnect?.();
          });
          return;
        }
        default:
          throw new TypeError("Unknown child command.");
      }
      process.send?.({ id: message.id, ok: true, value });
    };
    void respond().catch((error: unknown) =>
      process.send?.({ id: message.id, ok: false, error: String(error) })
    );
  });
  try {
    started = await startup;
    process.send?.({
      event: "started",
      role: config.role,
      pid: process.pid,
      identity: entrypoint.identity,
      address,
    });
  } catch (error) {
    failed = true;
    process.send?.({
      event: "failed",
      role: config.role,
      pid: process.pid,
      error: String(error),
      events: [...state.events],
    });
  }
}
