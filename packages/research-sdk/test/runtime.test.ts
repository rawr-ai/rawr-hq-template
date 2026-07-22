import { Cause, Context, Effect, Exit, Fiber, Layer, Option } from "effect";
import { describe, expect, test } from "vitest";
import { makeBunCommandProcess, makeResearchProcessRuntime } from "../src/runtime/index.js";
import { digestIdentity } from "./fixtures.js";

describe("process-scoped Effect runtime", () => {
  test("acquires one layer for multiple cells and releases it once", async () => {
    let acquired = 0;
    let released = 0;

    class Counter extends Context.Service<Counter, { readonly generation: number }>()(
      "@rawr/research-sdk/test/Counter"
    ) {}

    const layer = Layer.effect(
      Counter,
      Effect.acquireRelease(
        Effect.sync(() => ({ generation: ++acquired })),
        () => Effect.sync(() => void (released += 1))
      )
    );
    const runtime = makeResearchProcessRuntime(layer);

    const first = await runtime.runPromiseExit(Effect.map(Counter, ({ generation }) => generation));
    const second = await runtime.runPromiseExit(
      Effect.map(Counter, ({ generation }) => generation)
    );

    expect(Exit.isSuccess(first) && first.value).toBe(1);
    expect(Exit.isSuccess(second) && second.value).toBe(1);
    await Promise.all([runtime.dispose(), runtime.dispose()]);
    expect(acquired).toBe(1);
    expect(released).toBe(1);
  });

  test("interrupts active work on disposal and returns a typed Exit afterward", async () => {
    let acquired = 0;
    let released = 0;
    let announceAcquisition: (() => void) | undefined;
    const acquisition = new Promise<void>((resolve) => {
      announceAcquisition = resolve;
    });

    class Resource extends Context.Service<Resource, { readonly live: true }>()(
      "@rawr/research-sdk/test/Resource"
    ) {}

    const layer = Layer.effect(
      Resource,
      Effect.acquireRelease(
        Effect.sync(() => {
          acquired += 1;
          announceAcquisition?.();
          return { live: true } as const;
        }),
        () => Effect.sync(() => void (released += 1))
      )
    );
    const runtime = makeResearchProcessRuntime(layer);
    const active = runtime.runPromiseExit(Effect.flatMap(Resource, () => Effect.never));

    await acquisition;
    await runtime.dispose();
    const interrupted = await active;
    const afterDisposal = await runtime.runPromiseExit(Effect.succeed("unreachable"));

    expect(acquired).toBe(1);
    expect(released).toBe(1);
    expect(Exit.isFailure(interrupted)).toBe(true);
    expect(Exit.isFailure(afterDisposal)).toBe(true);
    if (Exit.isFailure(afterDisposal)) {
      expect(Option.getOrThrow(Cause.findErrorOption(afterDisposal.cause))).toEqual({
        kind: "ResearchRuntimeUnavailable",
        state: "Disposed",
      });
    }
  });

  test("keeps finalizer failure visible while closing the runtime once", async () => {
    let released = 0;

    class Resource extends Context.Service<Resource, { readonly live: true }>()(
      "@rawr/research-sdk/test/FailingResource"
    ) {}

    const layer = Layer.effect(
      Resource,
      Effect.acquireRelease(Effect.succeed({ live: true } as const), () =>
        Effect.sync(() => {
          released += 1;
          throw new Error("synthetic finalizer failure");
        })
      )
    );
    const runtime = makeResearchProcessRuntime(layer);
    const acquired = await runtime.runPromiseExit(Resource);

    expect(Exit.isSuccess(acquired)).toBe(true);
    await expect(runtime.dispose()).rejects.toBeDefined();
    await expect(runtime.dispose()).rejects.toBeDefined();
    expect(released).toBe(1);

    const afterDisposal = await runtime.runPromiseExit(Effect.succeed("unreachable"));
    expect(Exit.isFailure(afterDisposal)).toBe(true);
  });
});

describe("Bun command capability", () => {
  test("uses structured argv, canonical cwd, and an explicit replacement environment", async () => {
    const command = makeBunCommandProcess();
    process.env.RESEARCH_SDK_HOST_ONLY = "must-not-leak";

    try {
      const result = await Effect.runPromise(
        command.run({
          executable: process.execPath,
          arguments: [
            "-e",
            "console.log(JSON.stringify({ only: process.env.RESEARCH_SDK_ONLY, leaked: process.env.RESEARCH_SDK_HOST_ONLY, cwd: process.cwd() })); console.error('stderr-channel')",
          ],
          cwd: import.meta.dirname,
          environment: { RESEARCH_SDK_ONLY: "present" },
          timeoutMs: 5_000,
          terminationGraceMs: 500,
        })
      );
      const parsed = JSON.parse(new TextDecoder().decode(result.stdout));

      expect(result.exitCode).toBe(0);
      expect(parsed).toEqual({ only: "present", cwd: import.meta.dirname });
      expect(new TextDecoder().decode(result.stderr).trim()).toBe("stderr-channel");
    } finally {
      delete process.env.RESEARCH_SDK_HOST_ONLY;
    }
  });

  test("keeps a nonzero child exit as terminal result data", async () => {
    const result = await Effect.runPromise(
      makeBunCommandProcess().run({
        executable: process.execPath,
        arguments: ["-e", "process.exit(7)"],
        cwd: import.meta.dirname,
        environment: {},
        timeoutMs: 5_000,
        terminationGraceMs: 500,
      })
    );

    expect(result.exitCode).toBe(7);
  });

  test("confirms child termination before reporting a timeout", async () => {
    const command = makeBunCommandProcess();
    const outcome = await Effect.runPromise(
      command
        .run({
          executable: process.execPath,
          arguments: ["-e", "await Bun.sleep(10_000)"],
          cwd: import.meta.dirname,
          environment: {},
          timeoutMs: 30,
          terminationGraceMs: 1_000,
        })
        .pipe(
          Effect.match({
            onFailure: (error) => error,
            onSuccess: (result) => result,
          })
        )
    );

    expect(outcome.kind).toBe("CommandTimedOut");
  });

  test("retains interruption and unconfirmed termination in one Effect cause", async () => {
    let terminationAttempts = 0;
    const command = makeBunCommandProcess({
      terminateAndConfirm: async (target) => {
        terminationAttempts += 1;
        target.kill("SIGKILL");
        await target.exited;
        return {
          kind: "Unconfirmed",
          outcome: {
            kind: "ProcessTerminationUnconfirmed",
            processLocator: `pid:${target.pid}`,
            requestedSignal: "SIGKILL",
            detailDigest: digestIdentity(
              "research-sdk.command-termination-detail.v1",
              "synthetic-unconfirmed-interrupt"
            ),
          },
        };
      },
    });
    const fiber = Effect.runFork(
      command.run({
        executable: process.execPath,
        arguments: ["-e", "await Bun.sleep(10_000)"],
        cwd: import.meta.dirname,
        environment: {},
        timeoutMs: 5_000,
        terminationGraceMs: 500,
      })
    );
    await Bun.sleep(30);
    await Effect.runPromise(Fiber.interrupt(fiber));
    const exit = await Effect.runPromise(Fiber.await(fiber));

    expect(terminationAttempts).toBe(1);
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
      expect(
        exit.cause.reasons
          .filter(Cause.isFailReason)
          .some(({ error }) => error.kind === "ProcessTerminationUnconfirmed")
      ).toBe(true);
    }
  });

  test("runs one termination owner when timeout cannot confirm exit", async () => {
    let terminationAttempts = 0;
    const command = makeBunCommandProcess({
      terminateAndConfirm: async (target) => {
        terminationAttempts += 1;
        target.kill("SIGKILL");
        await target.exited;
        return {
          kind: "Unconfirmed",
          outcome: {
            kind: "ProcessTerminationUnconfirmed",
            processLocator: `pid:${target.pid}`,
            requestedSignal: "SIGKILL",
            detailDigest: digestIdentity(
              "research-sdk.command-termination-detail.v1",
              "synthetic-unconfirmed-timeout"
            ),
          },
        };
      },
    });
    const exit = await Effect.runPromiseExit(
      command.run({
        executable: process.execPath,
        arguments: ["-e", "await Bun.sleep(10_000)"],
        cwd: import.meta.dirname,
        environment: {},
        timeoutMs: 30,
        terminationGraceMs: 500,
      })
    );

    expect(terminationAttempts).toBe(1);
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const failures = exit.cause.reasons.filter(Cause.isFailReason).map(({ error }) => error.kind);
      expect(failures).toContain("CommandTimedOut");
      expect(failures).toContain("ProcessTerminationUnconfirmed");
    }
  });

  test("awaits an in-flight timeout termination before interruption returns", async () => {
    let announceTermination: (() => void) | undefined;
    const terminationStarted = new Promise<void>((resolve) => {
      announceTermination = resolve;
    });
    let releaseTermination: (() => void) | undefined;
    const terminationGate = new Promise<void>((resolve) => {
      releaseTermination = resolve;
    });
    let terminationAttempts = 0;
    const command = makeBunCommandProcess({
      terminateAndConfirm: async (target) => {
        terminationAttempts += 1;
        target.kill("SIGKILL");
        await target.exited;
        announceTermination?.();
        await terminationGate;
        return {
          kind: "Unconfirmed",
          outcome: {
            kind: "ProcessTerminationUnconfirmed",
            processLocator: `pid:${target.pid}`,
            requestedSignal: "SIGKILL",
            detailDigest: digestIdentity(
              "research-sdk.command-termination-detail.v1",
              "synthetic-in-flight-timeout"
            ),
          },
        };
      },
    });
    const fiber = Effect.runFork(
      command.run({
        executable: process.execPath,
        arguments: ["-e", "await Bun.sleep(10_000)"],
        cwd: import.meta.dirname,
        environment: {},
        timeoutMs: 30,
        terminationGraceMs: 500,
      })
    );

    await terminationStarted;
    let interruptionReturned = false;
    const interruption = Effect.runPromise(Fiber.interrupt(fiber)).then(() => {
      interruptionReturned = true;
    });
    await Bun.sleep(20);
    expect(interruptionReturned).toBe(false);

    releaseTermination?.();
    await interruption;
    const exit = await Effect.runPromise(Fiber.await(fiber));

    expect(terminationAttempts).toBe(1);
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.some(Cause.isInterruptReason)).toBe(true);
      expect(
        exit.cause.reasons.filter(Cause.isFailReason).map(({ error }) => error.kind)
      ).toContain("ProcessTerminationUnconfirmed");
    }
  });

  test("rejects unresolved command locations before spawning", async () => {
    const command = makeBunCommandProcess();
    const outcome = await Effect.runPromise(
      command
        .run({
          executable: "bun",
          arguments: [],
          cwd: ".",
          environment: {},
          timeoutMs: 100,
          terminationGraceMs: 100,
        })
        .pipe(
          Effect.match({
            onFailure: (error) => error,
            onSuccess: (result) => result,
          })
        )
    );

    expect(outcome).toEqual(
      expect.objectContaining({
        kind: "InvalidCommandRequest",
        field: "executable",
      })
    );
  });
});

describe("package-local vendor closure", () => {
  test("resolves the admitted package versions inside the SDK", async () => {
    const versions = await Promise.all(
      ["effect", "typebox", "typescript", "@types/bun"].map(async (name) => {
        const url = import.meta.resolve(`${name}/package.json`);
        const manifest = (await Bun.file(new URL(url)).json()) as {
          readonly version: string;
        };
        return [name, manifest.version] as const;
      })
    );

    expect(Object.fromEntries(versions)).toEqual({
      effect: "4.0.0-beta.99",
      typebox: "1.3.6",
      typescript: "7.0.2",
      "@types/bun": "1.3.14",
    });
  });
});
