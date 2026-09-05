import { describe, expect, test } from "bun:test";

import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import {
  defineApp,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineSchedule,
  Effect,
  type EffectExecutionPolicy,
  type ExecutionDescriptor,
} from "../../definition/src/index";
import {
  deriveRuntimeArtifacts,
  type ExecutionDescriptorRef,
  type ExecutionDescriptorTable,
} from "../../derivation/src/index";
import {
  type CompiledExecutableBoundary,
  type CreateExecutionRegistryInput,
  createExecutionRegistry,
  type ExecutionRegistry,
  readCompiledExecutableBoundary,
} from "../src/execution-registry";
import { createInvocationTracker } from "../src/invocation-tracker";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Registry fixture must contain this value.");
  return value;
}

function fixture(empty = false) {
  let effectCalls = 0;
  const step = defineAsyncStepEffect({
    id: "refresh",
    policy: {
      retry: { times: 2, backoff: "fixed", delay: 1 },
      timeout: { duration: 50 },
      interruptible: true,
    },
    effect() {
      effectCalls += 1;
      return Effect.succeed("refreshed");
    },
  });
  const plugin = defineAsyncSchedulePlugin.factory()({
    capability: "registry-jobs",
    services: {},
    schedules: [
      defineSchedule({ id: "daily", cron: "0 0 * * *", steps: [step], async run() {} }),
      defineSchedule({ id: "hourly", cron: "0 * * * *", steps: [step], async run() {} }),
    ],
  })();
  const app = defineApp({ id: "registry.app", plugins: empty ? [] : [plugin] });
  const profile = defineRuntimeProfile({ id: "registry.profile", providers: [] });
  const process = defineProcessCatalog({
    worker: { id: "registry.worker", roles: ["async"] },
  }).worker;
  const entrypoint = defineEntrypoint({
    id: "registry.entrypoint",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "registry.entrypoint",
      deployment: "test",
      source: "execution-registry-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  const admission = createInvocationTracker();
  const input: CreateExecutionRegistryInput = {
    processId: process.id,
    registryInput: compilation.plan.executionRegistryInput,
    executionPlans: compilation.plan.executionPlans,
    descriptorTable: derivation.executionDescriptorTable,
    assertOpen: admission.assertOpen,
  };
  return { input, admission, effectCalls: () => effectCalls };
}

function corruptDescriptors(
  table: ExecutionDescriptorTable,
  change: (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) => unknown
): ExecutionDescriptorTable {
  const replacements = new Map(
    table.entries().map(([, descriptor]) => [descriptor, change(descriptor)])
  );
  return {
    kind: "execution.descriptor-table",
    entries: () =>
      table.entries().map(([ref, descriptor]) => [ref, replacements.get(descriptor)] as const),
    get: (ref) => replacements.get(table.get(ref)),
  } as ExecutionDescriptorTable;
}

describe("ExecutionRegistry", () => {
  test("matches a real derived table and compiled plans without invoking authored Effects", () => {
    const { input, effectCalls } = fixture();
    const registry = createExecutionRegistry(input);
    expect(registry.kind).toBe("execution.registry");
    expect(Object.isFrozen(registry)).toBe(true);
    expect(input.descriptorTable.entries()).toHaveLength(2);
    for (const [ref, descriptor] of input.descriptorTable.entries()) {
      const boundary = registry.get<string, string, never, { readonly tenant: string }>({ ...ref });
      expect(boundary.kind).toBe("compiled.executable-boundary");
      expect(boundary.descriptor === descriptor).toBe(true);
      expect(boundary.ref).toBe(boundary.plan.ref);
      expect(boundary.plan).toEqual(
        required(input.executionPlans.find((plan) => plan.ref.executionId === ref.executionId))
      );
      expect(Object.keys(boundary).sort()).toEqual(["descriptor", "kind", "plan", "ref"]);
      expect(Object.isFrozen(boundary)).toBe(true);
      expect(Object.isFrozen(boundary.ref)).toBe(true);
      expect(Object.isFrozen(boundary.plan.policy.retry)).toBe(true);
      expect(Object.isFrozen(boundary.plan.policy.timeout)).toBe(true);
      expect(registry.get(ref)).toBe(boundary);
      expect(readCompiledExecutableBoundary(registry, boundary)).toBe(boundary);
    }
    expect(effectCalls()).toBe(0);
  });

  test("accepts a genuinely derived empty process table", () => {
    const { input, effectCalls } = fixture(true);
    expect(input.descriptorTable.entries()).toEqual([]);
    expect(createExecutionRegistry(input).kind).toBe("execution.registry");
    expect(effectCalls()).toBe(0);
  });

  test.each([
    undefined,
    null,
    {},
    { kind: "web.route-module-table" },
  ])("refuses an absent or wrong descriptor table: %j", (descriptorTable) => {
    const { input, effectCalls } = fixture();
    expect(() =>
      createExecutionRegistry({
        ...input,
        descriptorTable: descriptorTable as unknown as ExecutionDescriptorTable,
      })
    ).toThrow(TypeError);
    expect(effectCalls()).toBe(0);
  });

  test("requires valid assembly and compiled DTO values", () => {
    const { input } = fixture();
    for (const change of [
      { processId: "" },
      { assertOpen: undefined },
      { executionPlans: null },
      { registryInput: { ...input.registryInput, unexpected: true } },
      { executionPlans: [{ ...required(input.executionPlans[0]), unexpected: true }] },
    ]) {
      expect(() =>
        createExecutionRegistry({ ...input, ...change } as CreateExecutionRegistryInput)
      ).toThrow(TypeError);
    }
  });

  test("refuses duplicate execution ids in every matching input", () => {
    const { input } = fixture();
    const plans = input.executionPlans;
    const boundaries = input.registryInput.boundaries;
    const entries = input.descriptorTable.entries();
    expect(() =>
      createExecutionRegistry({ ...input, executionPlans: [...plans, required(plans[0])] })
    ).toThrow(TypeError);
    expect(() =>
      createExecutionRegistry({
        ...input,
        registryInput: {
          ...input.registryInput,
          boundaries: [...boundaries, required(boundaries[0])],
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      createExecutionRegistry({
        ...input,
        descriptorTable: {
          ...input.descriptorTable,
          entries: () => [...entries, required(entries[0])],
        },
      })
    ).toThrow(TypeError);
  });

  test("refuses missing plans, descriptors, and registry boundaries", () => {
    const { input } = fixture();
    expect(() =>
      createExecutionRegistry({ ...input, executionPlans: input.executionPlans.slice(1) })
    ).toThrow(TypeError);
    expect(() =>
      createExecutionRegistry({
        ...input,
        descriptorTable: {
          ...input.descriptorTable,
          entries: () => input.descriptorTable.entries().slice(1),
        },
      })
    ).toThrow(TypeError);
    expect(() =>
      createExecutionRegistry({
        ...input,
        registryInput: {
          ...input.registryInput,
          boundaries: input.registryInput.boundaries.slice(1),
        },
      })
    ).toThrow(TypeError);
  });

  test("refuses input execution ids that disagree with their refs", () => {
    const { input } = fixture();
    const [first, second] = input.registryInput.boundaries;
    expect(() =>
      createExecutionRegistry({
        ...input,
        registryInput: {
          ...input.registryInput,
          boundaries: [
            { ...required(first), executionId: required(second).executionId },
            required(second),
          ],
        },
      })
    ).toThrow(TypeError);
  });

  test("requires full structural refs, not only execution ids", () => {
    const { input } = fixture();
    const registry = createExecutionRegistry(input);
    const plan = required(input.executionPlans[0]);
    const changed = { ...plan.ref, stepId: "different-step" } as ExecutionDescriptorRef;
    expect(() => registry.get(changed)).toThrow(TypeError);
    expect(() =>
      registry.get({ ...plan.ref, ownerId: `plugin-owner:sha256:${"0".repeat(64)}` })
    ).toThrow(TypeError);
    const extraField = { ...plan.ref, unexpected: true };
    expect(() => registry.get(extraField)).toThrow(TypeError);
    expect(() =>
      createExecutionRegistry({
        ...input,
        executionPlans: input.executionPlans.map((candidate) =>
          candidate === plan ? { ...candidate, ref: changed } : candidate
        ),
        registryInput: {
          ...input.registryInput,
          boundaries: input.registryInput.boundaries.map((entry) =>
            entry.executionId === plan.ref.executionId ? { ...entry, ref: changed } : entry
          ),
        },
      })
    ).toThrow(TypeError);
    const other = required(input.executionPlans[1]);
    expect(() =>
      createExecutionRegistry({
        ...input,
        descriptorTable: {
          ...input.descriptorTable,
          get: () => input.descriptorTable.get(other.ref),
        },
      })
    ).toThrow(TypeError);
  });

  test("refuses non-operational, mutable, or identity-mismatched descriptors", () => {
    const { input, effectCalls } = fixture();
    const changes = [
      () => undefined,
      (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) => ({ ...descriptor }),
      (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) =>
        Object.freeze({ ...descriptor, kind: "async.step-effect" }),
      (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) =>
        Object.freeze({ ...descriptor, run: undefined }),
      (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) =>
        Object.freeze({ ...descriptor, executionId: "other" }),
      (descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown>) =>
        Object.freeze({ ...descriptor, boundary: "plugin.cli-command" }),
    ];
    for (const change of changes) {
      expect(() =>
        createExecutionRegistry({
          ...input,
          descriptorTable: corruptDescriptors(input.descriptorTable, change),
        })
      ).toThrow(TypeError);
    }
    expect(effectCalls()).toBe(0);
  });

  test("matches every policy field exactly before any invocation", () => {
    const { input, effectCalls } = fixture();
    const plan = required(input.executionPlans[0]);
    const policy = plan.policy;
    const changes: readonly EffectExecutionPolicy[] = [
      { ...policy, retry: { ...policy.retry, times: 3 } },
      { ...policy, retry: { ...policy.retry, backoff: "exponential" } },
      { ...policy, retry: { ...policy.retry, delay: 2 } },
      { ...policy, timeout: { duration: 51 } },
      { ...policy, interruptible: false },
      {},
    ];
    for (const changed of changes) {
      expect(() =>
        createExecutionRegistry({
          ...input,
          executionPlans: input.executionPlans.map((candidate) =>
            candidate === plan ? { ...candidate, policy: changed } : candidate
          ),
        })
      ).toThrow(TypeError);
    }
    expect(effectCalls()).toBe(0);
  });

  test("snapshots compiler-owned data without mutating it", () => {
    const { input } = fixture();
    const executionPlans = structuredClone(input.executionPlans);
    const registryInput = structuredClone(input.registryInput);
    const plan = required(executionPlans[0]);
    const registry = createExecutionRegistry({ ...input, executionPlans, registryInput });
    const boundary = registry.get(plan.ref);
    expect(Object.isFrozen(plan)).toBe(false);
    Object.assign(plan.ref, { stepId: "changed" });
    Object.assign(plan.policy.retry ?? {}, { times: 100 });
    Object.assign(required(registryInput.boundaries[0]).ref, { stepId: "changed-again" });
    expect(registry.get(boundary.ref)).toBe(boundary);
    expect(boundary.plan.policy.retry?.times).toBe(2);
  });

  test("refuses nested authored policy drift after assembly", () => {
    const { input } = fixture();
    const retry = { times: 2, backoff: "fixed" as const, delay: 1 };
    const descriptorTable = corruptDescriptors(input.descriptorTable, (descriptor) =>
      Object.freeze({
        ...descriptor,
        policy: Object.freeze({ ...descriptor.policy, retry }),
      })
    );
    const registry = createExecutionRegistry({ ...input, descriptorTable });
    const boundary = registry.get(required(input.executionPlans[0]).ref);
    retry.times = 3;
    expect(() => registry.get(boundary.ref)).toThrow(TypeError);
    expect(() => readCompiledExecutableBoundary(registry, boundary)).toThrow(TypeError);
  });

  test("admits only the exact nominal boundary from its actual registry", () => {
    const { input } = fixture();
    const registry = createExecutionRegistry(input);
    const boundary = registry.get<string, number, Error, { readonly tenant: string }>(
      required(input.executionPlans[0]).ref
    );
    const typed: CompiledExecutableBoundary<string, number, Error, { readonly tenant: string }> =
      boundary;
    const shell = {
      kind: boundary.kind,
      ref: boundary.ref,
      plan: boundary.plan,
      descriptor: boundary.descriptor,
    };
    // @ts-expect-error A structurally reconstructed boundary lacks private registry admission.
    const forged: typeof typed = shell;
    expect(() => readCompiledExecutableBoundary(registry, forged)).toThrow(TypeError);
    const symbolCopy = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(boundary)
    ) as typeof boundary;
    expect(() => readCompiledExecutableBoundary(registry, symbolCopy)).toThrow(TypeError);
    const otherRegistry = createExecutionRegistry(input);
    expect(() => readCompiledExecutableBoundary(otherRegistry, boundary)).toThrow(TypeError);
    const forgedRegistry = Object.create(Object.getPrototypeOf(registry)) as ExecutionRegistry;
    expect(() => readCompiledExecutableBoundary(forgedRegistry, boundary)).toThrow(TypeError);
    expect(readCompiledExecutableBoundary(registry, typed)).toBe(boundary);
  });

  test("refuses lookup, stale boundary admission, and reassembly after process stop", async () => {
    const { input, admission, effectCalls } = fixture();
    const registry = createExecutionRegistry(input);
    const boundary = registry.get(required(input.executionPlans[0]).ref);
    await admission.closeAndDrain();
    expect(() => registry.get(boundary.ref)).toThrow(TypeError);
    expect(() => readCompiledExecutableBoundary(registry, boundary)).toThrow(TypeError);
    expect(() => createExecutionRegistry(input)).toThrow(TypeError);
    expect(effectCalls()).toBe(0);
  });
});
