import { expect, test } from "bun:test";
import { Exit } from "effect";
import { type Continuation, createInvocationTracker } from "../src/invocation-tracker";

async function turn() {
  await Bun.sleep(10);
}

test("Response metadata and the same invocation survive lazy body pulls after admission closes", async () => {
  const tracker = createInvocationTracker();
  const release = Promise.withResolvers<void>();
  let own: Continuation | undefined;
  let pulled = false;
  const response = await tracker.run(
    async (lease) => {
      own = lease;
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            await release.promise;
            tracker.assertAdmission(lease);
            pulled = true;
            controller.enqueue(new TextEncoder().encode("late body"));
            controller.close();
          },
        }),
        {
          status: 201,
          statusText: "Authored Status",
          headers: [
            ["x-body", "native"],
            ["set-cookie", "first=1"],
            ["set-cookie", "second=2"],
          ],
        }
      );
    },
    undefined,
    { responseBody: true }
  );
  expect(response).toBeInstanceOf(Response);
  expect(response.status).toBe(201);
  expect(response.statusText).toBe("Authored Status");
  expect(response.headers.get("x-body")).toBe("native");
  expect(response.headers.getSetCookie()).toEqual(["first=1", "second=2"]);
  expect(pulled).toBe(false);
  let drained = false;
  const draining = tracker.closeAndDrain().then(() => {
    drained = true;
  });
  try {
    await turn();
    expect(drained).toBe(false);
    expect(() => tracker.assertAdmission(own)).not.toThrow();
    await expect(tracker.run(async () => "new root")).rejects.toThrow(TypeError);
    release.resolve();
    expect(await response.text()).toBe("late body");
    await draining;
    expect(() => tracker.assertAdmission(own)).toThrow(TypeError);
  } finally {
    release.resolve();
    await response.body?.cancel().catch(() => {});
    await draining;
  }
});

test("native cancellation cannot retain hidden abandoned pull work; expired capabilities refuse", async () => {
  const tracker = createInvocationTracker();
  const pullEntered = Promise.withResolvers<void>();
  const releasePull = Promise.withResolvers<void>();
  const cancelEntered = Promise.withResolvers<void>();
  const releaseCancel = Promise.withResolvers<void>();
  const pullSettled = Promise.withResolvers<void>();
  const reason = new Error("exact body cancellation");
  let own: Continuation | undefined;
  let observed: unknown;
  let lateLookupFailure: unknown;
  const result = await tracker.runExit(
    async (lease) => {
      own = lease;
      return Exit.succeed(
        new Response(
          new ReadableStream({
            async pull() {
              pullEntered.resolve();
              await releasePull.promise;
              try {
                tracker.assertAdmission(lease);
              } catch (error) {
                lateLookupFailure = error;
              }
              pullSettled.resolve();
            },
            async cancel(value) {
              observed = value;
              cancelEntered.resolve();
              await releaseCancel.promise;
              tracker.assertAdmission(lease);
            },
          })
        )
      );
    },
    undefined,
    { responseBody: true }
  );
  if (Exit.isFailure(result)) throw new Error("Expected a successful Response Exit.");
  const failure = Exit.fail(reason);
  expect(await tracker.runExit(async () => failure)).toBe(failure);
  await pullEntered.promise;
  let drained = false;
  const draining = tracker.closeAndDrain().then(() => {
    drained = true;
  });
  const cancelling = result.value.body!.cancel(reason);
  try {
    await cancelEntered.promise;
    expect(observed).toBe(reason);
    releaseCancel.resolve();
    await cancelling;
    await turn();
    expect(drained).toBe(true);
    expect(() => tracker.assertAdmission(own)).toThrow(TypeError);
    releasePull.resolve();
    await pullSettled.promise;
    expect(lateLookupFailure).toBeInstanceOf(TypeError);
  } finally {
    releasePull.resolve();
    releaseCancel.resolve();
    await cancelling;
    await draining;
  }
});

test("authored cancellation joins its pending pull before the successful Exit Response can drain", async () => {
  const tracker = createInvocationTracker();
  const releasePull = Promise.withResolvers<void>();
  const pullEntered = Promise.withResolvers<void>();
  const cancelEntered = Promise.withResolvers<void>();
  let own: Continuation | undefined;
  const result = await tracker.runExit(
    async (lease) => {
      own = lease;
      let pulling: Promise<void> | undefined;
      return Exit.succeed(
        new Response(
          new ReadableStream({
            pull() {
              pulling = releasePull.promise.then(() => {
                tracker.assertAdmission(lease);
              });
              pullEntered.resolve();
              return pulling;
            },
            async cancel() {
              cancelEntered.resolve();
              await pulling;
              tracker.assertAdmission(lease);
            },
          })
        )
      );
    },
    undefined,
    { responseBody: true }
  );
  if (Exit.isFailure(result)) throw new Error("Expected a successful Response Exit.");
  await pullEntered.promise;
  let drained = false;
  const draining = tracker.closeAndDrain().then(() => {
    drained = true;
  });
  const cancelling = result.value.body!.cancel();
  try {
    await cancelEntered.promise;
    await turn();
    expect(drained).toBe(false);
    expect(() => tracker.assertAdmission(own)).not.toThrow();
    releasePull.resolve();
    await cancelling;
    await draining;
    expect(() => tracker.assertAdmission(own)).toThrow(TypeError);
  } finally {
    releasePull.resolve();
    await Promise.all([cancelling, draining]);
  }
});

test("native Bun accepts the retained branded body and process drain outlives native cancel cleanup", async () => {
  const tracker = createInvocationTracker();
  const release = Promise.withResolvers<void>();
  const cancelEntered = Promise.withResolvers<void>();
  const events: string[] = [];
  let own: Continuation | undefined;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    idleTimeout: 0,
    fetch: () =>
      tracker.run(
        async (lease) => {
          own = lease;
          let first = true;
          return new Response(
            new ReadableStream<Uint8Array>({
              async pull(controller) {
                tracker.assertAdmission(lease);
                if (first) {
                  first = false;
                  controller.enqueue(new TextEncoder().encode("first"));
                } else {
                  await release.promise;
                  tracker.assertAdmission(lease);
                }
              },
              async cancel() {
                events.push("cancel-entered");
                cancelEntered.resolve();
                await release.promise;
                tracker.assertAdmission(lease);
                events.push("cancel-settled");
              },
            }),
            { status: 202, headers: { "x-native": "preserved" } }
          );
        },
        undefined,
        { responseBody: true }
      ),
  });
  const abort = new AbortController();
  let stopping: Promise<void> | undefined;
  let draining: Promise<void> | undefined;
  try {
    const response = await fetch(server.url, { signal: abort.signal });
    expect(response.status).toBe(202);
    expect(response.headers.get("x-native")).toBe("preserved");
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("first");
    abort.abort();
    await reader.read().catch(() => {});
    await cancelEntered.promise;
    let drained = false;
    draining = tracker.closeAndDrain().then(() => {
      drained = true;
      events.push("process-drained");
    });
    stopping = server.stop(false).then(() => {
      events.push("native-stopped");
    });
    await stopping;
    expect(drained).toBe(false);
    expect(() => tracker.assertAdmission(own)).not.toThrow();
    release.resolve();
    await draining;
    expect(events).toEqual([
      "cancel-entered",
      "native-stopped",
      "cancel-settled",
      "process-drained",
    ]);
    expect(() => tracker.assertAdmission(own)).toThrow(TypeError);
  } finally {
    abort.abort();
    release.resolve();
    await Promise.all([stopping ?? server.stop(false), draining ?? tracker.closeAndDrain()]);
  }
});

test("bodyless native responses do not acquire a stream lease", async () => {
  const tracker = createInvocationTracker();
  const response = new Response(null, { status: 204 });
  expect(await tracker.run(async () => response, undefined, { responseBody: true })).toBe(response);
  const errorResponse = Response.error();
  const retained = await tracker.run(async () => errorResponse, undefined, { responseBody: true });
  expect(retained.type).toBe("error");
  expect(retained.status).toBe(0);
  await retained.text();
  await tracker.closeAndDrain();
});

test("a non-web Response is an ordinary output, not an unconsumed HTTP lifetime", async () => {
  const tracker = createInvocationTracker();
  const source = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("not consumed as HTTP"));
      },
    })
  );
  let own: Continuation | undefined;
  const output = await tracker.run(async (lease) => {
    own = lease;
    return source;
  });
  try {
    expect(output).toBe(source);
    expect(() => tracker.assertAdmission(own)).toThrow(TypeError);
    await tracker.closeAndDrain();
    expect(source.bodyUsed).toBe(false);
  } finally {
    await output.body?.cancel();
    await tracker.closeAndDrain();
  }
});
