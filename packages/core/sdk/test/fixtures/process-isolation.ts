import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Inngest } from "inngest";
import { type Static, Type } from "typebox";
import { Check } from "typebox/value";
import { freePort, startDevServer, until } from "./async-native/dev-server.js";
import { prepareProcessIsolation } from "./process-isolation-setup.js";

const roleSchema = Type.Union([Type.Literal("server"), Type.Literal("async")]);
type Role = Static<typeof roleSchema>;
const identitySchema = Type.Object(
  {
    app: Type.String(),
    process: Type.String(),
    entrypoint: Type.String(),
    deployment: Type.String(),
    source: Type.String(),
  },
  { additionalProperties: false }
);
const catalogSchema = Type.Object({
  processIdentity: Type.Object({
    id: Type.String(),
    deployment: Type.String(),
    source: Type.String(),
  }),
  appIdentity: Type.Object({ id: Type.String() }),
  entrypointIdentity: Type.Object({ id: Type.String() }),
  roles: Type.Array(Type.String()),
  resources: Type.Array(Type.Object({ resourceId: Type.String() })),
  providers: Type.Array(Type.Object({ providerId: Type.String() })),
  harnesses: Type.Array(
    Type.Object({ harnessId: Type.String(), mountStatus: Type.String(), stopStatus: Type.String() })
  ),
  lifecycleStatus: Type.Object({ mounting: Type.String(), finalization: Type.String() }),
  finalization: Type.Object({
    deadline: Type.Union([Type.Number(), Type.Null()]),
    pendingNativeStop: Type.Array(Type.String()),
    deadlineExceeded: Type.Boolean(),
  }),
});
const snapshotSchema = Type.Object({
  role: roleSchema,
  pid: Type.Integer(),
  incarnation: Type.String(),
  identity: identitySchema,
  startedIdentity: Type.Union([identitySchema, Type.Null()]),
  nativeMountIdentity: Type.Union([identitySchema, Type.Null()]),
  catalog: Type.Union([catalogSchema, Type.Null()]),
  immutable: Type.Object({
    entrypoint: Type.Boolean(),
    identity: Type.Boolean(),
    started: Type.Boolean(),
    startedIdentity: Type.Boolean(),
    nativeMountIdentity: Type.Boolean(),
    catalog: Type.Boolean(),
  }),
  sameIdentity: Type.Object({ started: Type.Boolean(), nativeMount: Type.Boolean() }),
  lease: Type.Union([
    Type.Object({
      token: Type.String(),
      pid: Type.Integer(),
      path: Type.String(),
      fd: Type.Integer(),
      alive: Type.Boolean(),
    }),
    Type.Null(),
  ]),
  events: Type.Array(Type.String()),
  counters: Type.Object({
    leaseBuild: Type.Integer(),
    leaseAcquire: Type.Integer(),
    leaseRelease: Type.Integer(),
    clientBuild: Type.Integer(),
    clientAcquire: Type.Integer(),
    clientRelease: Type.Integer(),
    nativeMount: Type.Integer(),
    nativeStop: Type.Integer(),
    operationsStarted: Type.Integer(),
    operationsCompleted: Type.Integer(),
    operationsFinalized: Type.Integer(),
    outerRuns: Type.Integer(),
  }),
  pendingKeys: Type.Array(Type.String()),
  stop: Type.Object({
    requested: Type.Boolean(),
    samePromise: Type.Union([Type.Boolean(), Type.Null()]),
    settled: Type.Boolean(),
  }),
});
type Snapshot = Static<typeof snapshotSchema>;
const startedSchema = Type.Object({
  event: Type.Literal("started"),
  role: roleSchema,
  pid: Type.Integer(),
  identity: identitySchema,
  address: Type.String(),
});
const failedSchema = Type.Object({
  event: Type.Literal("failed"),
  role: roleSchema,
  pid: Type.Integer(),
  error: Type.String(),
  events: Type.Array(Type.String()),
});
const startupSchema = Type.Union([startedSchema, failedSchema]);
const replySchema = Type.Union([
  Type.Object({ id: Type.Integer(), ok: Type.Literal(true), value: Type.Unknown() }),
  Type.Object({ id: Type.Integer(), ok: Type.Literal(false), error: Type.String() }),
]);
const healthSchema = Type.Object({
  identity: identitySchema,
  kind: Type.Union([Type.Literal("readiness"), Type.Literal("liveness")]),
  status: Type.String(),
});
const healthStopSchema = Type.Object({
  readiness: healthSchema,
  liveness: healthSchema,
  afterStopRefused: Type.Boolean(),
  samePromise: Type.Boolean(),
});
const resultSchema = Type.Object({ key: Type.String(), token: Type.String(), pid: Type.Integer() });

async function bounded<T>(label: string, promise: Promise<T>, ms = 45_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const prepared = await prepareProcessIsolation();
const children: Child[] = [];
const executionRoot = join(prepared.root, "execution");
const requiredResource = join(executionRoot, "async-required-resource");
const dev = await (async () => {
  try {
    await mkdir(executionRoot);
    await writeFile(requiredResource, "real async backing resource");
    return await startDevServer();
  } catch (error) {
    await prepared.cleanup();
    throw error;
  }
})();
const producer = new Inngest({ id: "isolation-proof-producer", isDev: true, baseUrl: dev.base });
const deployment = "local-process-proof";
const source = "packed-sdk-built-app";

class Child {
  readonly startup = Promise.withResolvers<Static<typeof startupSchema>>();
  readonly requests = new Map<number, ReturnType<typeof Promise.withResolvers<unknown>>>();
  readonly process;
  readonly exited: Promise<number | null>;
  readonly log: string;
  private sequence = 0;

  constructor(
    readonly role: Role,
    readonly incarnation: string,
    readonly port: number
  ) {
    this.log = join(executionRoot, `${role}-${incarnation}.log`);
    const fd = openSync(this.log, "w");
    try {
      this.process = fork(role === "server" ? prepared.serverEntry : prepared.asyncEntry, [], {
        cwd: prepared.root,
        execPath: process.execPath,
        stdio: ["ignore", fd, fd, "ipc"],
        env: {
          ...process.env,
          NO_COLOR: "1",
          HABITAT_ISOLATION_CONFIG: JSON.stringify({
            role,
            port,
            devServerUrl: dev.base,
            workspaceRoot: executionRoot,
            deployment,
            source,
            incarnation,
          }),
        },
      });
    } finally {
      closeSync(fd);
    }
    this.process.on("message", (message: unknown) => {
      if (Check(startupSchema, message)) {
        this.startup.resolve(message);
      } else if (Check(replySchema, message)) {
        const deferred = this.requests.get(message.id);
        this.requests.delete(message.id);
        if (message.ok) deferred?.resolve(message.value);
        else deferred?.reject(new Error(message.error));
      } else {
        this.reject(new TypeError(`Invalid child evidence: ${JSON.stringify(message)}`));
      }
    });
    this.process.on("error", (error) => this.reject(error));
    this.exited = new Promise((resolve) => {
      // close also follows a spawn error, where there may be no exit event.
      this.process.once("close", (code, signal) => {
        this.reject(new Error(`${role}/${incarnation} exited ${code ?? signal}`));
        resolve(code);
      });
    });
    // Requests can intentionally remain pending while their sibling is exercised.
    void this.startup.promise.catch(() => {});
    children.push(this);
  }

  private reject(error: Error) {
    this.startup.reject(error);
    for (const deferred of this.requests.values()) deferred.reject(error);
    this.requests.clear();
  }

  request(command: string, extra: { key?: string; kind?: string } = {}): Promise<unknown> {
    const id = ++this.sequence;
    const deferred = Promise.withResolvers<unknown>();
    this.requests.set(id, deferred);
    this.process.send({ id, command, ...extra }, (error) => {
      if (error) deferred.reject(error);
    });
    return bounded(`${this.role}/${this.incarnation} ${command}`, deferred.promise).finally(() =>
      this.requests.delete(id)
    );
  }

  async snapshot(): Promise<Snapshot> {
    const value = await this.request("snapshot");
    assert(Check(snapshotSchema, value), JSON.stringify(value));
    return value;
  }

  async start() {
    const result = await bounded(`${this.role} startup`, this.startup.promise);
    assert.equal(result.pid, this.process.pid);
    assert.equal(result.role, this.role);
    assert(Check(startedSchema, result), JSON.stringify(result));
    assert.deepEqual(result.identity, expectedIdentity(this.role));
    if (this.role === "async") {
      const sync = await fetch(result.address, {
        method: "PUT",
        signal: AbortSignal.timeout(5000),
      });
      assert(sync.ok, await sync.text());
      await until(
        "exact native function registration",
        () => dev.query<{ functions: { slug: string }[] }>("{functions{slug}}"),
        (data) =>
          data.functions.length === 1 &&
          data.functions[0]?.slug === "process-isolation-async-isolation-work"
      );
    }
    const snapshot = await this.snapshot();
    assertLive(snapshot);
    await this.assertHealthy();
    return snapshot;
  }

  async assertHealthy() {
    for (const kind of ["readiness", "liveness"] as const) {
      const value = await this.request("health", { kind });
      assert(Check(healthSchema, value), JSON.stringify(value));
      assert.equal(value.kind, kind);
      assert.equal(value.status, "passing");
      assert.deepEqual(value.identity, expectedIdentity(this.role));
    }
  }

  async healthStop() {
    const value = await this.request("health-stop");
    assert(Check(healthStopSchema, value), JSON.stringify(value));
    assert.equal(value.samePromise, true);
    assert.equal(value.afterStopRefused, true);
    for (const kind of ["readiness", "liveness"] as const) {
      assert.equal(value[kind].kind, kind);
      assert.deepEqual(value[kind].identity, expectedIdentity(this.role));
      assert.notEqual(value[kind].status, "passing", "late probe cannot resurrect stopped health");
    }
  }

  async exit() {
    await this.request("exit");
    assert.equal(await bounded(`${this.role} graceful child exit`, this.exited), 0);
  }
}

function expectedIdentity(role: Role) {
  return { app: "process-isolation", process: role, entrypoint: role, deployment, source };
}

function assertLive(snapshot: Snapshot) {
  assert.deepEqual(snapshot.identity, expectedIdentity(snapshot.role));
  assert.deepEqual(snapshot.startedIdentity, snapshot.identity);
  assert.deepEqual(snapshot.nativeMountIdentity, snapshot.identity);
  assert(Object.values(snapshot.immutable).every(Boolean));
  assert(Object.values(snapshot.sameIdentity).every(Boolean));
  assert(snapshot.lease?.alive);
  assert.equal(snapshot.lease.pid, snapshot.pid);
  assert.equal(snapshot.counters.leaseAcquire, 1);
  assert.equal(snapshot.counters.leaseRelease, 0);
  assert.equal(snapshot.counters.nativeMount, 1);
  assert.equal(snapshot.counters.nativeStop, 0);
  assert.equal(snapshot.counters.clientAcquire, snapshot.role === "async" ? 1 : 0);
  assert.equal(snapshot.counters.clientBuild, snapshot.role === "async" ? 1 : 0);
  assert(snapshot.catalog);
  assert.deepEqual(snapshot.catalog.processIdentity, { id: snapshot.role, deployment, source });
  assert.deepEqual(snapshot.catalog.appIdentity, { id: "process-isolation" });
  assert.deepEqual(snapshot.catalog.entrypointIdentity, { id: snapshot.role });
  assert.deepEqual(snapshot.catalog.roles, [snapshot.role]);
  const resourceIds =
    snapshot.role === "async" ? ["isolation.file", "isolation.inngest"] : ["isolation.file"];
  assert.deepEqual(
    [...new Set(snapshot.catalog.resources.map((resource) => resource.resourceId))].sort(),
    resourceIds
  );
  assert.deepEqual(
    snapshot.catalog.providers.map((provider) => provider.providerId).sort(),
    resourceIds.map((id) => `${id}-provider`)
  );
  assert.deepEqual(
    snapshot.catalog.harnesses.map((harness) => harness.harnessId),
    [`isolation-${snapshot.role}`]
  );
  assert.equal(snapshot.catalog.lifecycleStatus.mounting, "mounted");
  assert.equal(snapshot.catalog.lifecycleStatus.finalization, "unobserved");
  assert.equal(snapshot.stop.requested, false);
}

function stable(snapshot: Snapshot) {
  // Observation timestamps change on reads; compare the actual sibling ownership facts.
  return {
    pid: snapshot.pid,
    identity: snapshot.identity,
    nativeMountIdentity: snapshot.nativeMountIdentity,
    lease: snapshot.lease,
    counters: snapshot.counters,
    events: snapshot.events,
    pendingKeys: snapshot.pendingKeys,
    stop: snapshot.stop,
    lifecycle: snapshot.catalog?.lifecycleStatus,
    harnesses: snapshot.catalog?.harnesses,
    finalization: snapshot.catalog?.finalization,
  };
}

function assertResult(value: unknown, child: Snapshot, key: string) {
  assert(Check(resultSchema, value), JSON.stringify(value));
  assert(child.lease);
  assert.deepEqual(value, { key, token: child.lease.token, pid: child.pid });
}

async function http(child: Child, key: string, hold = false): Promise<unknown> {
  const response = await fetch(`http://127.0.0.1:${child.port}/api/probe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, hold }),
    signal: AbortSignal.timeout(45_000),
  });
  assert(response.ok, await response.clone().text());
  return response.json();
}

async function event(key: string, hold = false) {
  const sent = await producer.send({ name: "process-isolation/work", data: { key, hold } });
  assert.equal(sent.ids.length, 1);
  return sent.ids[0]!;
}

async function held(child: Child, key: string) {
  return until(
    `${child.role} held native body`,
    () => child.snapshot(),
    (value) => value.pendingKeys.includes(key)
  );
}

async function assertDraining(child: Child) {
  const snapshot = await until(
    `${child.role} native drain beyond deadline`,
    () => child.snapshot(),
    (value) => value.catalog?.finalization.deadlineExceeded === true
  );
  assert(snapshot.lease?.alive);
  assert.equal(snapshot.counters.leaseRelease, 0);
  assert.equal(snapshot.counters.clientRelease, 0);
  assert.equal(snapshot.stop.settled, false);
  assert.equal(snapshot.stop.samePromise, true);
  assert.equal(snapshot.catalog?.lifecycleStatus.finalization, "draining");
  assert.deepEqual(snapshot.catalog?.finalization.pendingNativeStop, [`isolation-${child.role}`]);
}

async function assertStopped(child: Child) {
  await child.request("stop");
  const snapshot = await child.snapshot();
  assert(snapshot.lease && !snapshot.lease.alive);
  assert.equal(snapshot.stop.samePromise, true);
  assert.equal(snapshot.stop.settled, true);
  assert.equal(snapshot.counters.leaseRelease, 1);
  assert.equal(snapshot.counters.nativeStop, 1);
  assert.equal(snapshot.counters.clientRelease, child.role === "async" ? 1 : 0);
  assert.equal(snapshot.counters.operationsStarted, snapshot.counters.operationsCompleted);
  assert.equal(snapshot.counters.operationsStarted, snapshot.counters.operationsFinalized);
  for (const marker of ["lease-acquired", "native-mounted", "native-stopped", "lease-released"])
    assert(snapshot.events.includes(marker), `Missing ${marker}`);
  assert(snapshot.events.indexOf("native-stopped") < snapshot.events.indexOf("lease-released"));
  assert.equal(snapshot.catalog?.lifecycleStatus.finalization, "settled");
  await assert.rejects(readFile(snapshot.lease.path), { code: "ENOENT" });
}

let proofFailed = false;
let cleanupFailures: unknown[] = [];
let receipt: unknown;
try {
  const serverA = new Child("server", "a", await freePort());
  const asyncA = new Child("async", "a", await freePort());
  const serverInitial = await serverA.start();
  const asyncInitial = await asyncA.start();
  assert.notEqual(serverInitial.pid, asyncInitial.pid);
  assert.notEqual(serverInitial.lease?.token, asyncInitial.lease?.token);
  assertResult(await http(serverA, "server-initial"), serverInitial, "server-initial");
  assertResult(
    await dev.output(await dev.completed(await event("async-initial")), false),
    asyncInitial,
    "async-initial"
  );

  const serverHeld = http(serverA, "server-a-held", true);
  void serverHeld.catch(() => {});
  const asyncHeld = await event("async-a-held", true);
  await held(serverA, "server-a-held");
  const asyncBaseline = stable(await held(asyncA, "async-a-held"));
  await serverA.healthStop();
  await assertDraining(serverA);
  assert.deepEqual(stable(await asyncA.snapshot()), asyncBaseline);
  await serverA.request("release", { key: "server-a-held" });
  assertResult(await serverHeld, serverInitial, "server-a-held");
  await assertStopped(serverA);
  await serverA.exit();
  assert.deepEqual(stable(await asyncA.snapshot()), asyncBaseline);

  const serverB = new Child("server", "b", await freePort());
  const serverRestarted = await serverB.start();
  assert.notEqual(serverRestarted.pid, serverInitial.pid);
  assert.notEqual(serverRestarted.lease?.token, serverInitial.lease?.token);
  assert.deepEqual(serverRestarted.identity, serverInitial.identity);
  assertResult(await http(serverB, "server-restarted"), serverRestarted, "server-restarted");
  const serverBHeld = http(serverB, "server-b-held", true);
  void serverBHeld.catch(() => {});
  const serverBaseline = stable(await held(serverB, "server-b-held"));
  await asyncA.healthStop();
  await assertDraining(asyncA);
  assert.deepEqual(stable(await serverB.snapshot()), serverBaseline);
  await asyncA.request("release", { key: "async-a-held" });
  await assertStopped(asyncA);
  // The admitted step finishes, but replay may need a later request to the now closed listener.
  const stoppedRun = await until(
    "native outcome after async drain",
    () => dev.eventRun(asyncHeld),
    (run) => run?.status === "COMPLETED" || run?.status === "FAILED"
  );
  assert(stoppedRun);
  assert(
    stoppedRun.history.some(
      (entry) => entry.type === "StepCompleted" && entry.stepName === "read-lease"
    )
  );
  if (stoppedRun.status === "COMPLETED") {
    assertResult(await dev.output(stoppedRun, false), asyncInitial, "async-a-held");
  } else {
    assert(
      stoppedRun.output?.includes("Unable to reach SDK URL"),
      stoppedRun.output ?? "missing failure"
    );
  }
  await asyncA.exit();
  assert.deepEqual(stable(await serverB.snapshot()), serverBaseline);

  const asyncB = new Child("async", "b", await freePort());
  const asyncRestarted = await asyncB.start();
  assert.notEqual(asyncRestarted.pid, asyncInitial.pid);
  assert.notEqual(asyncRestarted.lease?.token, asyncInitial.lease?.token);
  assert.deepEqual(asyncRestarted.identity, asyncInitial.identity);
  assertResult(
    await dev.output(await dev.completed(await event("async-restarted")), false),
    asyncRestarted,
    "async-restarted"
  );
  await assertStopped(asyncB);
  await asyncB.exit();
  assert.deepEqual(stable(await serverB.snapshot()), serverBaseline);

  await rm(requiredResource);
  const failed = new Child("async", "missing-resource", await freePort());
  const failure = await bounded("real async acquisition failure", failed.startup.promise);
  assert(Check(failedSchema, failure), JSON.stringify(failure));
  assert.equal(failure.pid, failed.process.pid);
  assert.equal(failure.role, "async");
  const failedSnapshot = await failed.snapshot();
  assert.equal(failedSnapshot.startedIdentity, null);
  assert.equal(failedSnapshot.nativeMountIdentity, null);
  assert.equal(failedSnapshot.catalog, null);
  assert.equal(failedSnapshot.counters.leaseAcquire, 1);
  assert.equal(failedSnapshot.counters.leaseRelease, 1);
  assert.equal(failedSnapshot.counters.clientBuild, 1);
  assert.equal(failedSnapshot.counters.clientAcquire, 0);
  assert.equal(failedSnapshot.counters.nativeMount, 0);
  assert.equal(failedSnapshot.counters.operationsStarted, 0);
  assert.deepEqual(failedSnapshot.events, ["lease-acquired", "lease-released"]);
  assert(failedSnapshot.lease && !failedSnapshot.lease.alive);
  await assert.rejects(readFile(failedSnapshot.lease.path), { code: "ENOENT" });
  await failed.exit();
  assert.deepEqual(stable(await serverB.snapshot()), serverBaseline);
  await serverB.assertHealthy();
  assertResult(
    await http(serverB, "server-after-async-failure"),
    serverRestarted,
    "server-after-async-failure"
  );
  await serverB.healthStop();
  await assertDraining(serverB);
  await serverB.request("release", { key: "server-b-held" });
  assertResult(await serverBHeld, serverRestarted, "server-b-held");
  await assertStopped(serverB);
  await serverB.exit();
  receipt = {
    result: "PASS",
    proof: "packed SDK, same app, independent built server and native async children",
    pids: children.map((child) => child.process.pid),
    independentlyRestarted: ["server", "async"],
    missingResource: "nonempty rollback, no mount, sibling still serving",
    health: "distinct readiness/liveness, late probes fail closed",
    nativeRunAfterStop: stoppedRun.status,
  };
} catch (error) {
  proofFailed = true;
  for (const child of children) {
    const log = await readFile(child.log, "utf8").catch(String);
    console.error(`${child.role}/${child.incarnation}:\n${log}`);
  }
  throw error;
} finally {
  // Escalation belongs only to failed-test cleanup, never to accepted native stop evidence.
  const results = await Promise.allSettled(
    children.map(async (child) => {
      if (child.process.exitCode === null && child.process.signalCode === null)
        child.process.kill("SIGKILL");
      await bounded("owned child cleanup", child.exited, 10_000);
    })
  );
  results.push(...(await Promise.allSettled([dev.stop()])));
  results.push(...(await Promise.allSettled([prepared.cleanup()])));
  cleanupFailures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  if (proofFailed && cleanupFailures.length > 0)
    console.error("Additional cleanup failures", cleanupFailures);
}
if (cleanupFailures.length > 0)
  throw new AggregateError(cleanupFailures, "Owned fixture cleanup failed");
console.log(JSON.stringify(receipt));
