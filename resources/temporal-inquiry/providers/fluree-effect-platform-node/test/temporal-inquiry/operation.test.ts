import { resolve } from "node:path";
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from "vitest";

import type { FlureeProcessHandle, FlureeProcessOptions } from "../../fluree-process";

const mockWithFlureeProcess = vi.hoisted(() => vi.fn());

vi.mock("../../fluree-process", () => ({
  withFlureeProcess: mockWithFlureeProcess,
}));

import {
  runTemporalInquiryCommand,
  runTemporalInquiryOperation,
  type TemporalInquirySession,
  withTemporalInquirySession,
} from "../../index";
import { definitionFixture } from "./fixture";

const root = "/repo";
type TestSignal = "SIGINT" | "SIGTERM";

class TestSignalTarget {
  readonly pid = 4242;
  readonly kills: Array<Readonly<{ pid: number; signal: TestSignal }>> = [];
  private readonly listeners = new Map<TestSignal, Set<() => void>>();

  on(signal: TestSignal, listener: () => void): void {
    const listeners = this.listeners.get(signal) ?? new Set();
    listeners.add(listener);
    this.listeners.set(signal, listeners);
  }

  removeListener(signal: TestSignal, listener: () => void): void {
    this.listeners.get(signal)?.delete(listener);
  }

  kill(pid: number, signal: TestSignal): boolean {
    this.kills.push({ pid, signal });
    return true;
  }

  emit(signal: TestSignal): void {
    for (const listener of this.listeners.get(signal) ?? []) listener();
  }

  listenerCount(signal: TestSignal): number {
    return this.listeners.get(signal)?.size ?? 0;
  }
}

beforeEach(() => {
  mockWithFlureeProcess.mockReset();
  mockWithFlureeProcess.mockImplementation(
    async (
      options: FlureeProcessOptions,
      use: (runtime: FlureeProcessHandle) => Promise<unknown>
    ) =>
      use({
        access: options.access,
        cacheDirectory: "/cache",
        endpoint: `http://127.0.0.1:${String(options.port ?? 8091)}`,
        owner: {
          childPid: 456,
          createdAtMs: 0,
          nonce: "0123456789abcdef0123456789abcdef",
          ownerPid: 123,
        },
        runDirectory: "/run",
        signal: options.signal ?? new AbortController().signal,
        storagePath: options.storagePath,
        version: "4.1.4",
      })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFluree(options: {
  readonly indexing: boolean;
  readonly infoFailure?: unknown;
  readonly infoPositions?: readonly Readonly<{ commitT: number; indexT: number }>[];
  readonly phases?: string[];
}): string[] {
  const requests: string[] = [];
  let infoCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/health")) {
        options.phases?.push("ready");
        return new Response();
      }
      if (url.endsWith("/stats")) {
        options.phases?.push("posture");
        return new Response(JSON.stringify({ indexing_enabled: options.indexing }));
      }
      if (url.includes("/insert?ledger=")) {
        options.phases?.push("insert");
        return new Response("{}");
      }
      if (url.includes("/info/")) {
        if (options.infoFailure !== undefined) throw options.infoFailure;
        const positions = options.infoPositions ?? [{ commitT: 1, indexT: 1 }];
        const position = positions[Math.min(infoCalls, positions.length - 1)];
        if (position === undefined) throw new Error("Stub requires at least one ledger position");
        infoCalls += 1;
        options.phases?.push(`index:${String(position.indexT)}/${String(position.commitT)}`);
        return new Response(
          JSON.stringify({
            commit_t: position.commitT,
            index_t: position.indexT,
            ledger_id: definitionFixture.ledger,
          })
        );
      }
      if (url.endsWith("/query")) {
        options.phases?.push("query");
        return new Response("[]");
      }
      throw new Error(`Unexpected Fluree request: ${url}`);
    })
  );
  return requests;
}

function hasCreateLedger(client: object): client is Readonly<{ createLedger(): Promise<unknown> }> {
  return "createLedger" in client && typeof client.createLedger === "function";
}

test("keeps indexing enabled while giving a read-only session a capability-limited client", async () => {
  const requests = stubFluree({ indexing: true });

  await expect(
    withTemporalInquirySession(
      {
        definition: definitionFixture,
        root,
      },
      (session) =>
        session.read(async (client) => {
          expectTypeOf(client).toHaveProperty("query");
          expectTypeOf(client).not.toHaveProperty("createLedger");
          expectTypeOf(client).not.toHaveProperty("insert");
          expectTypeOf(client).not.toHaveProperty("upsert");

          expect(hasCreateLedger(client)).toBe(true);
          if (!hasCreateLedger(client)) throw new Error("Runtime client lost its access guard");
          await expect(client.createLedger()).rejects.toThrow(/requires write access/u);
          return "read";
        })
    )
  ).resolves.toBe("read");

  expect(requests).toEqual([
    "http://127.0.0.1:8091/health",
    "http://127.0.0.1:8091/v1/fluree/stats",
    "http://127.0.0.1:8091/v1/fluree/info/example/history:main",
  ]);
  expect(mockWithFlureeProcess).toHaveBeenCalledWith(
    expect.objectContaining({
      access: "write",
      port: 8091,
      storagePath: resolve(root, definitionFixture.runtime.storage ?? ""),
    }),
    expect.any(Function)
  );
});

test("reuses one indexed process across a write and multiple warm reads", async () => {
  const phases: string[] = [];
  stubFluree({ indexing: true, phases });

  const result = await withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    async (session) => {
      const written = await session.write(async (client) => {
        expectTypeOf(client).toHaveProperty("insert");
        await client.insert({ "@id": "urn:test:warm-session" });
        return "written";
      });
      const first = await session.read(async (client) => {
        phases.push("read:first");
        await client.query({ reasoning: "none", select: ["?first"], where: [] });
        return "first";
      });
      const second = await session.read(async (client) => {
        phases.push("read:second");
        await client.query({ reasoning: "none", select: ["?second"], where: [] });
        return "second";
      });
      return [written, first, second] as const;
    }
  );

  expect(result).toEqual(["written", "first", "second"]);
  expect(mockWithFlureeProcess).toHaveBeenCalledTimes(1);
  expect(phases).toEqual([
    "ready",
    "posture",
    "insert",
    "index:1/1",
    "index:1/1",
    "read:first",
    "query",
    "index:1/1",
    "read:second",
    "query",
  ]);
});

test("serializes a write, its published seal, and the following read", async () => {
  const phases: string[] = [];
  stubFluree({ indexing: true, phases });
  let releaseWrite: () => void = () => undefined;
  const writeGate = new Promise<void>((resolvePromise) => {
    releaseWrite = resolvePromise;
  });
  let markWriteStarted: () => void = () => undefined;
  const writeStarted = new Promise<void>((resolvePromise) => {
    markWriteStarted = resolvePromise;
  });

  await withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    async (session) => {
      const write = session.write(async () => {
        phases.push("write:start");
        markWriteStarted();
        await writeGate;
        phases.push("write:end");
        return "write";
      });
      await writeStarted;
      const read = session.read(async () => {
        phases.push("read");
        return "read";
      });

      await Promise.resolve();
      expect(phases).toEqual(["ready", "posture", "write:start"]);
      releaseWrite();
      await expect(Promise.all([write, read])).resolves.toEqual(["write", "read"]);
    }
  );

  expect(phases).toEqual([
    "ready",
    "posture",
    "write:start",
    "write:end",
    "index:1/1",
    "index:1/1",
    "read",
  ]);
});

test("rejects a nested session operation instead of queuing it behind itself", async () => {
  const requests = stubFluree({ indexing: true });
  let nestedCallbackRan = false;

  await expect(
    withTemporalInquirySession(
      {
        definition: definitionFixture,
        root,
      },
      (session) =>
        session.write(() =>
          session.read(async () => {
            nestedCallbackRan = true;
          })
        )
    )
  ).rejects.toThrow("Temporal inquiry session operations cannot be nested");

  expect(nestedCallbackRan).toBe(false);
  expect(requests).toEqual([
    "http://127.0.0.1:8091/health",
    "http://127.0.0.1:8091/v1/fluree/stats",
    "http://127.0.0.1:8091/v1/fluree/info/example/history:main",
  ]);
});

test("drains an admitted operation before a returned session callback can close", async () => {
  const phases: string[] = [];
  stubFluree({ indexing: true, phases });
  let releaseOperation: () => void = () => undefined;
  const operationGate = new Promise<void>((resolvePromise) => {
    releaseOperation = resolvePromise;
  });
  let markOperationStarted: () => void = () => undefined;
  const operationStarted = new Promise<void>((resolvePromise) => {
    markOperationStarted = resolvePromise;
  });
  let markCallbackReturned: () => void = () => undefined;
  const callbackReturned = new Promise<void>((resolvePromise) => {
    markCallbackReturned = resolvePromise;
  });

  const result = withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    async (session) => {
      void session.write(async () => {
        phases.push("operation:start");
        markOperationStarted();
        await operationGate;
        phases.push("operation:end");
      });
      await operationStarted;
      phases.push("callback:return");
      markCallbackReturned();
      return "complete";
    }
  );
  let sessionSettled = false;
  const observed = result.then((value) => {
    sessionSettled = true;
    phases.push("session:resolved");
    return value;
  });

  await callbackReturned;
  await Promise.resolve();
  expect(sessionSettled).toBe(false);
  expect(phases).toEqual(["ready", "posture", "operation:start", "callback:return"]);

  releaseOperation();
  await expect(observed).resolves.toBe("complete");
  expect(phases).toEqual([
    "ready",
    "posture",
    "operation:start",
    "callback:return",
    "operation:end",
    "index:1/1",
    "session:resolved",
  ]);
});

test("rejects calls through a session that escaped its closed process scope", async () => {
  const requests = stubFluree({ indexing: true });
  let escaped: TemporalInquirySession | undefined;

  await withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    async (session) => {
      escaped = session;
    }
  );

  if (escaped === undefined) throw new Error("Session callback did not expose its test handle");
  const requestCount = requests.length;
  await expect(escaped.read(async () => "late read")).rejects.toThrow(
    "Temporal inquiry session is closed"
  );
  expect(requests).toHaveLength(requestCount);
});

test("poisons session close when an admitted operation fails without being awaited", async () => {
  stubFluree({ indexing: true });
  const operationFailure = new Error("unawaited operation failed");

  await expect(
    withTemporalInquirySession(
      {
        definition: definitionFixture,
        root,
      },
      async (session) => {
        void session.write(async () => {
          throw operationFailure;
        });
        return "callback completed";
      }
    )
  ).rejects.toBe(operationFailure);
});

test("aggregates distinct session callback and queued operation failures", async () => {
  stubFluree({ indexing: true });
  const callbackFailure = new Error("session callback failed");
  const operationFailure = new Error("queued operation failed");

  const failure = await withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    async (session) => {
      void session.write(async () => {
        throw operationFailure;
      });
      throw callbackFailure;
    }
  ).catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw new Error("Expected aggregate failure");
  expect(failure.errors).toEqual([callbackFailure, operationFailure]);
});

test("seals an unindexed current head before invoking a read", async () => {
  const phases: string[] = [];
  stubFluree({
    indexing: true,
    infoPositions: [
      { commitT: 3, indexT: 1 },
      { commitT: 3, indexT: 3 },
    ],
    phases,
  });

  await withTemporalInquirySession(
    {
      definition: definitionFixture,
      root,
    },
    (session) =>
      session.read(async (client) => {
        phases.push("read");
        await client.query({ reasoning: "none", select: ["?answer"], where: [] });
      })
  );

  expect(phases).toEqual(["ready", "posture", "index:1/3", "index:3/3", "read", "query"]);
});

test("seals a bounded write after its callback commits and rejects", async () => {
  const requests = stubFluree({ indexing: true });
  const callbackFailure = new Error("callback failed after commit");

  await expect(
    runTemporalInquiryOperation(
      {
        access: "write",
        definition: definitionFixture,
        root,
      },
      async ({ access, client }) => {
        expectTypeOf(access).toEqualTypeOf<"write">();
        expectTypeOf(client).toHaveProperty("insert");
        await client.insert({ "@id": "urn:test:committed" });
        throw callbackFailure;
      }
    )
  ).rejects.toBe(callbackFailure);

  expect(requests).toEqual([
    "http://127.0.0.1:8091/health",
    "http://127.0.0.1:8091/v1/fluree/stats",
    "http://127.0.0.1:8091/v1/fluree/insert?ledger=example%2Fhistory%3Amain",
    "http://127.0.0.1:8091/v1/fluree/info/example/history:main",
  ]);
});

test("preserves callback and sealing failures when both reject", async () => {
  const sealFailure = new Error("index sealing failed");
  const requests = stubFluree({ indexing: true, infoFailure: sealFailure });
  const callbackFailure = new Error("callback failed after commit");

  const failure = await runTemporalInquiryOperation(
    {
      access: "write",
      definition: definitionFixture,
      root,
    },
    async ({ client }) => {
      await client.insert({ "@id": "urn:test:committed" });
      throw callbackFailure;
    }
  ).catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw new Error("Expected aggregate failure");
  expect(failure.errors).toEqual([callbackFailure, sealFailure]);
  expect(requests.at(-1)).toBe("http://127.0.0.1:8091/v1/fluree/info/example/history:main");
});

test("threads caller cancellation into the exact owned process scope", async () => {
  stubFluree({ indexing: true });
  const controller = new AbortController();

  await runTemporalInquiryOperation(
    {
      access: "read",
      definition: definitionFixture,
      root,
      signal: controller.signal,
    },
    async () => "read"
  );

  expect(mockWithFlureeProcess).toHaveBeenCalledWith(
    expect.objectContaining({ signal: controller.signal }),
    expect.any(Function)
  );
});

test("owns process signals for one command, cleans up, then re-delivers the first", async () => {
  const target = new TestSignalTarget();
  const events: string[] = [];
  const command = runTemporalInquiryCommand(async (signal) => {
    signal.addEventListener("abort", () => events.push("abort"));
    await new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  }, target);

  expect(target.listenerCount("SIGINT")).toBe(1);
  expect(target.listenerCount("SIGTERM")).toBe(1);
  target.emit("SIGINT");

  expect(target.listenerCount("SIGINT")).toBe(0);
  expect(target.listenerCount("SIGTERM")).toBe(0);
  target.emit("SIGTERM");
  await expect(command).rejects.toThrow("interrupted by SIGINT");
  expect(events).toEqual(["abort"]);
  expect(target.kills).toEqual([{ pid: 4242, signal: "SIGINT" }]);
});

test("removes command signal listeners after ordinary completion", async () => {
  const target = new TestSignalTarget();

  await expect(runTemporalInquiryCommand(async () => "complete", target)).resolves.toBe("complete");

  expect(target.listenerCount("SIGINT")).toBe(0);
  expect(target.listenerCount("SIGTERM")).toBe(0);
  expect(target.kills).toEqual([]);
});
