import { expect, test } from "bun:test";
import { getEventMeta, withEventMeta } from "@orpc/client";
import { createEffectClient } from "@orpc/experimental-effect";
import "@orpc/experimental-effect/extensions/effect";
import { AsyncIteratorClass, createRouterClient, os } from "@orpc/server";
import { Cause, Effect, Exit } from "effect";

import {
  type Continuation,
  createInvocationTracker,
  invocationContinuationContext,
} from "../src/invocation-tracker";

function gate() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function microtasks() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

test("native groups close only their roots and drain their inherited descendants", async () => {
  const tracker = createInvocationTracker();
  const first = tracker.group();
  const sibling = tracker.group();
  const releaseParent = gate();
  const releaseChild = gate();
  const releaseSibling = gate();
  const childEntered = gate();
  let child: Promise<void> | undefined;
  const parent = first.run(async (own) => {
    await releaseParent.promise;
    child = tracker.run(async () => {
      childEntered.resolve();
      await releaseChild.promise;
    }, own);
  });
  const unrelated = sibling.run(async () => releaseSibling.promise);
  const draining = first.closeAndDrain();
  expect(first.closeAndDrain()).toBe(draining);
  await expect(first.run(async () => "closed root")).rejects.toThrow(TypeError);
  expect(await sibling.run(async () => "other native owner")).toBe("other native owner");
  const all = tracker.closeAndDrain();
  let drained = false;
  void draining.then(() => {
    drained = true;
  });
  try {
    releaseParent.resolve();
    await childEntered.promise;
    await parent;
    await microtasks();
    expect(drained).toBe(false);
    releaseChild.resolve();
    await child;
    await draining;
    expect(drained).toBe(true);
    let allDrained = false;
    void all.then(() => {
      allDrained = true;
    });
    await microtasks();
    expect(allDrained).toBe(false);
  } finally {
    releaseParent.resolve();
    releaseChild.resolve();
    releaseSibling.resolve();
    await Promise.all([parent, unrelated, all]);
  }
});

test("native group drain retains a returned stream's cleanup and its live continuation", async () => {
  const tracker = createInvocationTracker();
  const group = tracker.group();
  const cleanup = gate();
  const cleanupEntered = gate();
  let parent: Continuation | undefined;
  const stream = await group.run(async (own) => {
    parent = own;
    return new ReadableStream({
      async cancel() {
        cleanupEntered.resolve();
        await cleanup.promise;
      },
    });
  });
  const draining = group.closeAndDrain();
  let drained = false;
  void draining.then(() => {
    drained = true;
  });
  const cancelling = stream.cancel();
  try {
    await cleanupEntered.promise;
    await microtasks();
    expect(drained).toBe(false);
    expect(await tracker.run(async () => "descendant", parent)).toBe("descendant");
    cleanup.resolve();
    await cancelling;
    await draining;
    expect(() => tracker.assertAdmission(parent)).toThrow(TypeError);
  } finally {
    cleanup.resolve();
    await tracker.closeAndDrain();
  }
});

test("native fiber continuation admits nested work during drain without admitting new roots", async () => {
  const tracker = createInvocationTracker();
  const entered = gate();
  const resume = gate();
  expect(tracker.captureContinuation()).toBeUndefined();
  const pending = tracker.run((own) =>
    Effect.runPromise(
      Effect.provideContext(
        Effect.gen(function* () {
          expect(tracker.captureContinuation()).toBe(own);
          entered.resolve();
          yield* Effect.promise(() => resume.promise);
          const parent = tracker.captureContinuation();
          expect(parent).toBe(own);
          expect(() => tracker.assertOpen()).toThrow(TypeError);
          const child = yield* Effect.promise(() =>
            tracker.run(
              (child) =>
                Effect.runPromise(
                  Effect.provideContext(
                    Effect.sync(() => tracker.captureContinuation()),
                    invocationContinuationContext(child)
                  )
                ),
              parent
            )
          );
          expect(child).toBeDefined();
          expect(child).not.toBe(parent);
          expect(() => tracker.assertAdmission(child)).toThrow(TypeError);
          expect(() => tracker.assertAdmission(parent)).not.toThrow();
          expect(tracker.captureContinuation()).toBe(parent);
          return own;
        }),
        invocationContinuationContext(own)
      )
    )
  );
  await entered.promise;
  const draining = tracker.closeAndDrain();
  try {
    expect(tracker.captureContinuation()).toBeUndefined();
    await expect(tracker.run(async () => "unrelated root")).rejects.toThrow(TypeError);
    resume.resolve();
    const settled = await pending;
    await draining;
    expect(() => tracker.assertAdmission(settled)).toThrow(TypeError);
    expect(tracker.captureContinuation()).toBeUndefined();
  } finally {
    resume.resolve();
    await pending;
    await draining;
  }
});

test("expired and foreign continuations refuse even while an unrelated owned request is live", async () => {
  const tracker = createInvocationTracker();
  const foreignTracker = createInvocationTracker();
  const release = gate();
  const expired = await tracker.run(async (own) => own);
  const live = tracker.run(async () => release.promise);
  let foreign: Continuation | undefined;
  const foreignPending = foreignTracker.run(async (own) => {
    foreign = own;
    await release.promise;
  });
  try {
    if (foreign === undefined) throw new Error("Expected an active foreign continuation.");
    const captured = await Effect.runPromise(
      Effect.provideContext(
        Effect.sync(() => tracker.captureContinuation()),
        invocationContinuationContext(foreign)
      )
    );
    expect(captured).toBe(foreign);
    let executed = 0;
    for (const parent of [expired, foreign]) {
      expect(() => tracker.assertAdmission(parent)).toThrow(TypeError);
      await expect(
        tracker.runExit(async () => {
          executed++;
          return Exit.succeed("must not execute");
        }, parent)
      ).rejects.toThrow(TypeError);
    }
    expect(executed).toBe(0);
    expect(await tracker.run(async () => "fresh root while open")).toBe("fresh root while open");
    const draining = tracker.closeAndDrain();
    await expect(tracker.run(async () => "expired after close", expired)).rejects.toThrow(
      TypeError
    );
    release.resolve();
    await Promise.all([live, foreignPending, draining]);
  } finally {
    release.resolve();
    await Promise.all([live, foreignPending]);
    await Promise.all([tracker.closeAndDrain(), foreignTracker.closeAndDrain()]);
  }
});

test("native request settlement precedes iterator lifetime and admitted consumption survives close", async () => {
  const tracker = createInvocationTracker();
  const events: string[] = [];
  const router = {
    values: os.effect(function* () {
      yield* Effect.succeed(undefined);
      return (async function* () {
        events.push("body");
        try {
          yield 1;
          return 9;
        } finally {
          events.push("finally");
        }
      })();
    }),
  };
  const client = createEffectClient(
    createRouterClient(router, {
      interceptors: [({ next }) => tracker.run(() => next())],
    })
  );
  const iterator = await Effect.runPromise(client.values());
  expect(events).toEqual([]);
  let drained = false;
  const draining = tracker.closeAndDrain();
  void draining.then(() => {
    drained = true;
  });
  expect(tracker.closeAndDrain()).toBe(draining);
  await microtasks();
  expect(drained).toBe(false);
  await expect(tracker.run(async () => "new")).rejects.toThrow(TypeError);
  expect(await iterator.next()).toEqual({ done: false, value: 1 });
  expect(drained).toBe(false);
  expect(await iterator.next()).toEqual({ done: true, value: 9 });
  await draining;
  expect(events).toEqual(["body", "finally"]);
  expect(drained).toBe(true);
});

test("early native return does not release a still-pending next operation", async () => {
  const tracker = createInvocationTracker();
  const started = gate();
  const releasePull = gate();
  let cleaned = 0;
  let pullSettled = false;
  const source = new AsyncIteratorClass<number, undefined>(
    async () => {
      started.resolve();
      await releasePull.promise;
      pullSettled = true;
      return { done: false, value: 7 };
    },
    async () => {
      cleaned++;
    }
  );
  let continuation: Continuation | undefined;
  const iterator = await tracker.run(async (own) => {
    continuation = own;
    return source;
  });
  if (continuation === undefined) throw new Error("Expected an iterator continuation.");
  expect(() => tracker.assertAdmission(continuation)).not.toThrow();
  const pull = iterator.next();
  await started.promise;
  const draining = tracker.closeAndDrain();
  let drained = false;
  void draining.then(() => {
    drained = true;
  });
  await iterator.return();
  expect(cleaned).toBe(1);
  expect(pullSettled).toBe(false);
  await microtasks();
  expect(drained).toBe(false);
  expect(await tracker.run(async () => "nested during pending pull", continuation)).toBe(
    "nested during pending pull"
  );
  releasePull.resolve();
  expect(await pull).toEqual({ done: false, value: 7 });
  await draining;
  expect(drained).toBe(true);
  expect(cleaned).toBe(1);
  expect(() => tracker.assertAdmission(continuation)).toThrow(TypeError);
});

test("native readable cancellation retains its in-flight cleanup and exact reason", async () => {
  const tracker = createInvocationTracker();
  const cancelStarted = gate();
  const releaseCancel = gate();
  const reason = Object.freeze({ reason: "caller cancellation" });
  let received: unknown;
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
    },
    async cancel(input) {
      received = input;
      cancelStarted.resolve();
      await releaseCancel.promise;
    },
  });
  const stream = await tracker.run(async () => source);
  const reader = stream.getReader();
  expect((await reader.read()).value).toEqual(new Uint8Array([1]));
  const draining = tracker.closeAndDrain();
  let drained = false;
  void draining.then(() => {
    drained = true;
  });
  const cancelling = reader.cancel(reason);
  await cancelStarted.promise;
  await microtasks();
  expect(received).toBe(reason);
  expect(drained).toBe(false);
  releaseCancel.resolve();
  await cancelling;
  await draining;
  expect(drained).toBe(true);
});

test("preserves native event metadata and extra output properties", async () => {
  const tracker = createInvocationTracker();
  const event = withEventMeta({ value: 1 }, { id: "event-1", retry: 25, comments: ["one"] });
  const returned = withEventMeta({ value: 2 }, { id: "event-2" });
  let count = 0;
  const source = Object.assign(
    new AsyncIteratorClass<{ value: number }, { value: number }>(
      async () => (count++ === 0 ? { done: false, value: event } : { done: true, value: returned }),
      async () => {}
    ),
    { label: "native-output" }
  );
  const iterator = await tracker.run(async () => source);
  const draining = tracker.closeAndDrain();
  expect(iterator.label).toBe("native-output");
  const first = await iterator.next();
  expect(first.value).toBe(event);
  expect(getEventMeta(first.value)).toEqual({ id: "event-1", retry: 25, comments: ["one"] });
  const last = await iterator.next();
  expect(last.value).toBe(returned);
  expect(getEventMeta(last.value)).toEqual({ id: "event-2" });
  await draining;
});

test("settles failed requests and native stream errors without replacing their errors", async () => {
  const requestTracker = createInvocationTracker();
  const primary = new Error("native operation failure");
  await expect(
    requestTracker.run(async () => {
      throw primary;
    })
  ).rejects.toBe(primary);
  await requestTracker.closeAndDrain();

  const iteratorTracker = createInvocationTracker();
  const source = new AsyncIteratorClass(
    async () => {
      throw primary;
    },
    async () => {}
  );
  const iterator = await iteratorTracker.run(async () => source);
  const iteratorDrain = iteratorTracker.closeAndDrain();
  await expect(iterator.next()).rejects.toBe(primary);
  await iteratorDrain;

  const streamTracker = createInvocationTracker();
  const stream = await streamTracker.run(
    async () =>
      new ReadableStream({
        start(controller) {
          controller.error(primary);
        },
      })
  );
  const streamDrain = streamTracker.closeAndDrain();
  await expect(stream.getReader().read()).rejects.toBe(primary);
  await streamDrain;
});

test("native iterator and readable cleanup rejection remain caller-visible while drain settles", async () => {
  const cleanup = new Error("native cleanup failure");
  const tracker = createInvocationTracker();
  const source = new AsyncIteratorClass(
    async () => ({ done: false, value: 1 }),
    async () => {
      throw cleanup;
    }
  );
  const iterator = await tracker.run(async () => source);
  const draining = tracker.closeAndDrain();
  await expect(iterator.return()).rejects.toBe(cleanup);
  await draining;

  const readableTracker = createInvocationTracker();
  const stream = await readableTracker.run(
    async () =>
      new ReadableStream({
        cancel() {
          throw cleanup;
        },
      })
  );
  const readableDrain = readableTracker.closeAndDrain();
  await expect(stream.cancel()).rejects.toBe(cleanup);
  await readableDrain;
});

test("retains native cleanup-error precedence when both iterator next and cleanup fail", async () => {
  const primary = new Error("next failed");
  const cleanup = new Error("cleanup supersedes next in native AsyncIteratorClass");
  const create = () =>
    new AsyncIteratorClass(
      async () => {
        throw primary;
      },
      async () => {
        throw cleanup;
      }
    );
  await expect(create().next()).rejects.toBe(cleanup);
  const tracker = createInvocationTracker();
  const iterator = await tracker.run(async () => create());
  const draining = tracker.closeAndDrain();
  await expect(iterator.next()).rejects.toBe(cleanup);
  await draining;
});

test("a successful native Exit retains its iterator across request settlement and close", async () => {
  const tracker = createInvocationTracker();
  const deliver = gate();
  const cleanupStarted = gate();
  const releaseCleanup = gate();
  const events: string[] = [];
  const source = new AsyncIteratorClass<number, undefined>(
    async () => ({ done: false, value: 7 }),
    async () => {
      events.push("cleanup-started");
      cleanupStarted.resolve();
      await releaseCleanup.promise;
      events.push("cleanup-finished");
    }
  );
  let continuation: Continuation | undefined;
  const result = tracker.runExit((own) => {
    continuation = own;
    return Effect.runPromiseExit(
      Effect.promise(async () => {
        await deliver.promise;
        events.push("request-settled");
        return source;
      })
    );
  });
  let drained = false;
  const draining = tracker.closeAndDrain();
  void draining.then(() => {
    drained = true;
  });
  try {
    await microtasks();
    expect(drained).toBe(false);
    deliver.resolve();
    const exit = await result;
    if (!Exit.isSuccess(exit)) throw new Error("Expected a successful native iterator Exit.");
    if (continuation === undefined) throw new Error("Expected a native Exit continuation.");
    expect(() => tracker.assertAdmission(continuation)).not.toThrow();
    await microtasks();
    expect(drained).toBe(false);
    expect(events).toEqual(["request-settled"]);
    let refusedCalls = 0;
    await expect(
      tracker.runExit(async () => {
        refusedCalls++;
        return Exit.succeed("new request");
      })
    ).rejects.toThrow(TypeError);
    expect(refusedCalls).toBe(0);
    expect(await exit.value.next()).toEqual({ done: false, value: 7 });
    const returning = exit.value.return();
    await cleanupStarted.promise;
    await microtasks();
    expect(drained).toBe(false);
    expect(await tracker.run(async () => "nested during cleanup", continuation)).toBe(
      "nested during cleanup"
    );
    releaseCleanup.resolve();
    await returning;
    await draining;
    expect(events).toEqual(["request-settled", "cleanup-started", "cleanup-finished"]);
    expect(drained).toBe(true);
    expect(() => tracker.assertAdmission(continuation)).toThrow(TypeError);
  } finally {
    deliver.resolve();
    releaseCleanup.resolve();
  }
});

test("a successful readable Exit retains cancellation cleanup and preserves its rejection", async () => {
  const tracker = createInvocationTracker();
  const cancelStarted = gate();
  const releaseCancel = gate();
  const reason = Object.freeze({ reason: "native-exit-consumer-stop" });
  const cleanup = new Error("native-exit-readable-cleanup");
  let received: unknown;
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([7]));
    },
    async cancel(input) {
      received = input;
      cancelStarted.resolve();
      await releaseCancel.promise;
      throw cleanup;
    },
  });
  let continuation: Continuation | undefined;
  const exit = await tracker.runExit((own) => {
    continuation = own;
    return Effect.runPromiseExit(Effect.succeed(source));
  });
  if (!Exit.isSuccess(exit)) throw new Error("Expected a successful native readable Exit.");
  if (continuation === undefined) throw new Error("Expected a readable continuation.");
  expect(() => tracker.assertAdmission(continuation)).not.toThrow();
  const reader = exit.value.getReader();
  expect((await reader.read()).value).toEqual(new Uint8Array([7]));
  let drained = false;
  const draining = tracker.closeAndDrain();
  void draining.then(() => {
    drained = true;
  });
  const cancelling = reader.cancel(reason);
  try {
    await cancelStarted.promise;
    await microtasks();
    expect(received).toBe(reason);
    expect(drained).toBe(false);
    expect(await tracker.run(async () => "nested during cancellation", continuation)).toBe(
      "nested during cancellation"
    );
    releaseCancel.resolve();
    await expect(cancelling).rejects.toBe(cleanup);
    await draining;
    expect(drained).toBe(true);
    expect(() => tracker.assertAdmission(continuation)).toThrow(TypeError);
  } finally {
    releaseCancel.resolve();
  }
});

test("runExit returns exact native failure exits and mixed causes while releasing admission", async () => {
  const expected = Object.freeze({ _tag: "ExpectedFailure", id: "exact-native-error" });
  const defect = new Error("exact-native-defect");
  const mixed = Cause.combine(
    Cause.combine(Cause.fail(expected), Cause.die(defect)),
    Cause.interrupt(123)
  );
  for (const cause of [Cause.fail(expected), Cause.die(defect), Cause.interrupt(123), mixed]) {
    const original = await Effect.runPromiseExit(Effect.failCause(cause));
    if (!Exit.isFailure(original)) throw new Error("Expected a native failure Exit.");
    const tracker = createInvocationTracker();
    const settle = gate();
    const pending = tracker.runExit(async () => {
      await settle.promise;
      return original;
    });
    let drained = false;
    const draining = tracker.closeAndDrain();
    void draining.then(() => {
      drained = true;
    });
    try {
      await microtasks();
      expect(drained).toBe(false);
      settle.resolve();
      const actual = await pending;
      expect(actual).toBe(original);
      if (!Exit.isFailure(actual)) throw new Error("The tracker changed a native failure Exit.");
      expect(actual.cause).toBe(original.cause);
      expect(actual.cause.reasons).toBe(original.cause.reasons);
      await draining;
      expect(drained).toBe(true);
    } finally {
      settle.resolve();
    }
  }
});
