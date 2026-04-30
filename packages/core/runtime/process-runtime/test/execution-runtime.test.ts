import { describe, expect, test } from "vitest";
import { Effect } from "@rawr/sdk/effect";
import type {
  ExecutionDescriptor,
  ExecutionDescriptorRef,
} from "@rawr/sdk/execution";
import {
  createExecutionDescriptorTable,
  createExecutionRegistry,
  createProcessExecutionRuntime,
} from "../src";

const ref = {
  kind: "execution.descriptor-ref",
  boundary: "plugin.server-api",
  executionId: "hq.server-api.work-items.list",
  appId: "hq",
  role: "server",
  surface: "server-api",
  capability: "work-items",
  routePath: ["GET", "/work-items"],
} as const satisfies ExecutionDescriptorRef;

describe("@rawr/core-runtime-process", () => {
  test("invokes descriptor refs through a runtime-owned Effect boundary", async () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: ({ prefix }: { readonly prefix: string }) =>
        Effect.succeed(`${prefix}:done`),
    } satisfies ExecutionDescriptor<
      unknown,
      string,
      never,
      { readonly prefix: string },
      never
    >;
    const table = createExecutionDescriptorTable([{ ref, descriptor }]);
    const registry = createExecutionRegistry({
      descriptorTable: table,
      plans: [{ kind: "compiled.execution-plan", ref }],
    });
    const runtime = createProcessExecutionRuntime({ registry });

    try {
      const result = await runtime.invoke<string>({
        ref,
        context: { prefix: "work" },
      });
      const directOutput = await runtime.execute<string>({
        ref,
        context: { prefix: "direct" },
      });
      const directExit = await runtime.executeExit<string>({
        ref,
        context: { prefix: "exit" },
      });

      expect(result.status).toBe("success");
      expect(result.status === "success" && result.output).toBe("work:done");
      expect(directOutput).toBe("direct:done");
      expect(directExit._tag).toBe("Success");
      expect(result.events.map((event) => event.name)).toEqual([
        "runtime.invoke.start",
        "runtime.invoke.success",
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("rejects duplicate descriptor table entries and reports failed effects", async () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: () => Effect.fail("boom"),
    } satisfies ExecutionDescriptor;

    expect(() =>
      createExecutionDescriptorTable([
        { ref, descriptor },
        { ref, descriptor },
      ]),
    ).toThrow("duplicate descriptor");

    const table = createExecutionDescriptorTable([{ ref, descriptor }]);
    const registry = createExecutionRegistry({
      descriptorTable: table,
      plans: [{ kind: "compiled.execution-plan", ref }],
    });
    const runtime = createProcessExecutionRuntime({ registry });

    try {
      const result = await runtime.invoke({ ref, context: {} });
      expect(result.status).toBe("failure");
      expect(result.events.at(-1)?.name).toBe("runtime.invoke.failure");
    } finally {
      await runtime.dispose();
    }
  });

  test("applies compiled execution timeout policy", async () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: () =>
        Effect.tryPromise(
          () =>
            new Promise<string>((resolve) => {
              setTimeout(() => resolve("late"), 100);
            }),
        ),
    } satisfies ExecutionDescriptor<unknown, string, unknown, unknown, never>;
    const runtime = createProcessExecutionRuntime({
      registry: createExecutionRegistry({
        descriptorTable: createExecutionDescriptorTable([{ ref, descriptor }]),
        plans: [{ kind: "compiled.execution-plan", ref, policy: { timeoutMs: 1 } }],
      }),
    });

    try {
      const result = await runtime.invoke({ ref, context: {} });
      expect(result.status).toBe("failure");
      expect(result.events.at(0)?.attributes).toMatchObject({ timeoutMs: 1 });
    } finally {
      await runtime.dispose();
    }
  });

  test("rejects invalid execution timeout policy before runtime invocation", () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: () => Effect.succeed(undefined),
    } satisfies ExecutionDescriptor;

    expect(() =>
      createExecutionRegistry({
        descriptorTable: createExecutionDescriptorTable([{ ref, descriptor }]),
        plans: [
          { kind: "compiled.execution-plan", ref, policy: { timeoutMs: -1 } },
        ],
      }),
    ).toThrow("invalid execution timeout");
  });

  test("normalizes generator descriptor bodies inside the runtime substrate", async () => {
    const descriptor = {
      kind: "execution.descriptor",
      ref,
      run: function* ({ prefix }: { readonly prefix: string }) {
        const suffix = yield* Effect.succeed("done");
        return `${prefix}:${suffix}`;
      },
    } satisfies ExecutionDescriptor<
      unknown,
      string,
      never,
      { readonly prefix: string },
      never
    >;
    const runtime = createProcessExecutionRuntime({
      registry: createExecutionRegistry({
        descriptorTable: createExecutionDescriptorTable([{ ref, descriptor }]),
        plans: [{ kind: "compiled.execution-plan", ref }],
      }),
    });

    try {
      await expect(
        runtime.execute({ ref, context: { prefix: "generated" } }),
      ).resolves.toBe("generated:done");
    } finally {
      await runtime.dispose();
    }
  });
});
