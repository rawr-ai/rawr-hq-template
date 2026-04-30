import { describe, expect, test } from "bun:test";
import {
  Cause,
  Effect,
  Exit,
  createEmptyManagedRuntime,
  effectVersionProof,
  pipe,
} from "../../src/vendor/effect/runtime";
import { processLocalResourceProbe } from "../../src/mini-runtime/process-resources";

describe("Effect vendor-native runtime lane", () => {
  test("uses the pinned Effect 3 runtime and proves gen plus pipe spelling", async () => {
    expect(effectVersionProof).toBe("3.21.2");

    const program = Effect.gen(function* () {
      const one = yield* Effect.succeed(1);
      const two = yield* Effect.succeed(2);
      return one + two;
    });

    const rootPipe = pipe(program, Effect.map((value) => value * 2));
    const valuePipe = program.pipe(Effect.map((value) => value + 4));

    await expect(Effect.runPromise(rootPipe)).resolves.toBe(6);
    await expect(Effect.runPromise(valuePipe)).resolves.toBe(7);
  });

  test("maps success, typed failure, defect, and interruption through Exit/Cause", async () => {
    const success = await Effect.runPromiseExit(Effect.succeed("ok"));
    expect(Exit.isSuccess(success)).toBe(true);
    if (Exit.isSuccess(success)) expect(success.value).toBe("ok");

    const failure = await Effect.runPromiseExit(Effect.fail("typed-failure"));
    expect(Exit.isFailure(failure)).toBe(true);
    if (Exit.isFailure(failure)) {
      expect(Cause.isFailure(failure.cause)).toBe(true);
    }

    const defect = await Effect.runPromiseExit(
      Effect.die(new Error("defect-failure")),
    );
    expect(Exit.isFailure(defect)).toBe(true);
    if (Exit.isFailure(defect)) {
      expect(Cause.isDie(defect.cause)).toBe(true);
    }

    const controller = new AbortController();
    const interrupted = Effect.runPromiseExit(Effect.never, {
      signal: controller.signal,
    });
    controller.abort();
    const interruptedExit = await interrupted;
    expect(Exit.isInterrupted(interruptedExit)).toBe(true);
  });

  test("runs scoped acquire/release and finalizers on success and interruption", async () => {
    const successEvents: string[] = [];
    const scopedResource = Effect.acquireRelease(
      Effect.sync(() => {
        successEvents.push("acquire");
        return "resource";
      }),
      (resource, exit) =>
        Effect.sync(() => {
          successEvents.push(`release:${resource}:${exit._tag}`);
        }),
    );

    const success = await Effect.runPromiseExit(
      Effect.scoped(
        Effect.gen(function* () {
          const resource = yield* scopedResource;
          successEvents.push(`use:${resource}`);
          return resource;
        }),
      ),
    );

    expect(Exit.isSuccess(success)).toBe(true);
    expect(successEvents).toEqual([
      "acquire",
      "use:resource",
      "release:resource:Success",
    ]);

    const interruptEvents: string[] = [];
    const interruptController = new AbortController();
    const interrupted = Effect.runPromiseExit(
      Effect.scoped(
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              interruptEvents.push("acquire");
              return "interrupt-resource";
            }),
            (resource, exit) =>
              Effect.sync(() => {
                interruptEvents.push(`release:${resource}:${exit._tag}`);
              }),
          );
          yield* Effect.never;
        }),
      ),
      { signal: interruptController.signal },
    );

    interruptController.abort();
    const interruptedExit = await interrupted;
    expect(Exit.isInterrupted(interruptedExit)).toBe(true);
    expect(interruptEvents).toEqual([
      "acquire",
      "release:interrupt-resource:Failure",
    ]);
  });

  test("runs process-local coordination primitives inside real Effect", async () => {
    const result = await Effect.runPromise(processLocalResourceProbe);

    expect(result).toEqual({
      queueValue: 7,
      pubSubValue: "local-message",
      refValue: 2,
      deferredValue: "deferred-ready",
      scheduleOutput: 2,
      streamValues: [1, 2, 3],
    });
  });

  test("creates a process-owned managed runtime wrapper and disposes it", async () => {
    const runtime = createEmptyManagedRuntime();
    const exit = await runtime.runPromiseExit(Effect.succeed("managed"));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) expect(exit.value).toBe("managed");

    await runtime.dispose();
  });
});
