import { isDeepStrictEqual } from "node:util";
import { Check } from "typebox/value";

import {
  type CompiledExecutionPlan,
  CompiledExecutionPlanSchema,
  type CompiledExecutionRegistryInput,
  CompiledExecutionRegistryInputSchema,
} from "../../compiler/src/index";
import type { EffectExecutionPolicy, ExecutionDescriptor } from "../../definition/src/index";
import { ExecutionDescriptorRefSchema } from "../../derivation/src/execution-descriptor-ref";
import type { ExecutionDescriptorRef, ExecutionDescriptorTable } from "../../derivation/src/index";

const boundaryWitness: unique symbol = Symbol("compiled.executable-boundary");

export interface CompiledExecutableBoundary<TInput, TSuccess, TError, TContext> {
  readonly kind: "compiled.executable-boundary";
  readonly ref: ExecutionDescriptorRef;
  readonly plan: CompiledExecutionPlan;
  readonly descriptor: ExecutionDescriptor<TInput, TSuccess, TError, TContext>;
  readonly [boundaryWitness]: true;
}

type ErasedDescriptor = ExecutionDescriptor<unknown, unknown, unknown, unknown>;
type ErasedBoundary = CompiledExecutableBoundary<unknown, unknown, unknown, unknown>;

export interface CreateExecutionRegistryInput {
  readonly processId: string;
  readonly registryInput: CompiledExecutionRegistryInput;
  readonly executionPlans: readonly CompiledExecutionPlan[];
  readonly descriptorTable: ExecutionDescriptorTable;
  readonly assertOpen: () => void;
}

function refuse(reason: string): never {
  throw new TypeError(`Execution registry ${reason}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRef(value: unknown): asserts value is ExecutionDescriptorRef {
  if (!Check(ExecutionDescriptorRefSchema, value)) refuse("received an invalid descriptor ref");
}

function sameRef(left: ExecutionDescriptorRef, right: ExecutionDescriptorRef): boolean {
  return isDeepStrictEqual({ ...left }, { ...right });
}

function snapshotPolicy(policy: EffectExecutionPolicy): EffectExecutionPolicy {
  return Object.freeze({
    ...policy,
    ...(policy.retry === undefined ? {} : { retry: Object.freeze({ ...policy.retry }) }),
    ...(policy.timeout === undefined ? {} : { timeout: Object.freeze({ ...policy.timeout }) }),
  });
}

function snapshotPlan(plan: CompiledExecutionPlan): CompiledExecutionPlan {
  return Object.freeze({
    kind: "compiled.execution-plan",
    ref: Object.freeze({ ...plan.ref }),
    policy: snapshotPolicy(plan.policy),
  });
}

function assertDescriptor(
  plan: CompiledExecutionPlan,
  descriptor: unknown
): asserts descriptor is ErasedDescriptor {
  if (
    !isRecord(descriptor) ||
    descriptor.kind !== "execution.effect" ||
    typeof descriptor.run !== "function" ||
    !Object.isFrozen(descriptor) ||
    descriptor.executionId !== plan.ref.executionId ||
    descriptor.boundary !== plan.ref.boundary
  ) {
    refuse("descriptor and compiled plan disagree");
  }
  const candidate = { ...plan, policy: descriptor.policy };
  if (!Check(CompiledExecutionPlanSchema, candidate)) refuse("descriptor policy is invalid");
  if (!isDeepStrictEqual(snapshotPolicy(candidate.policy), plan.policy)) {
    refuse("descriptor and compiled policy disagree");
  }
}

class Registry {
  readonly kind = "execution.registry";
  readonly #boundaries: ReadonlyMap<string, ErasedBoundary>;
  readonly #assertOpen: () => void;

  constructor(boundaries: ReadonlyMap<string, ErasedBoundary>, assertOpen: () => void) {
    this.#boundaries = boundaries;
    this.#assertOpen = assertOpen;
    Object.freeze(this);
  }

  get<TInput, TSuccess, TError, TContext>(
    ref: ExecutionDescriptorRef
  ): CompiledExecutableBoundary<TInput, TSuccess, TError, TContext> {
    this.#assertOpen();
    assertRef(ref);
    const boundary = this.#boundaries.get(ref.executionId);
    if (boundary === undefined || !sameRef(ref, boundary.ref)) {
      refuse("descriptor ref is absent");
    }
    // Exact descriptors stay author-owned; their nested policy must not drift after assembly.
    assertDescriptor(boundary.plan, boundary.descriptor);
    return boundary as CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>;
  }

  static admit<TInput, TSuccess, TError, TContext>(
    registry: Registry,
    boundary: CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>
  ): CompiledExecutableBoundary<TInput, TSuccess, TError, TContext> {
    if (typeof registry !== "object" || registry === null || !(#boundaries in registry)) {
      refuse("requires its original process registry");
    }
    registry.#assertOpen();
    if (
      !isRecord(boundary) ||
      !isRecord(boundary.ref) ||
      typeof boundary.ref.executionId !== "string" ||
      registry.#boundaries.get(boundary.ref.executionId) !== boundary
    ) {
      refuse("requires an exact boundary from this process registry");
    }
    assertDescriptor(boundary.plan, boundary.descriptor);
    return boundary;
  }
}

export type ExecutionRegistry = Registry;

/** Match cold artifacts once; this owner neither creates descriptors nor runs their bodies. */
export function createExecutionRegistry(input: CreateExecutionRegistryInput): ExecutionRegistry {
  if (
    !isRecord(input) ||
    typeof input.processId !== "string" ||
    input.processId.length === 0 ||
    typeof input.assertOpen !== "function" ||
    !Check(CompiledExecutionRegistryInputSchema, input.registryInput) ||
    !Array.isArray(input.executionPlans)
  ) {
    refuse("received invalid assembly input");
  }
  const table = input.descriptorTable;
  if (
    !isRecord(table) ||
    table.kind !== "execution.descriptor-table" ||
    typeof table.get !== "function" ||
    typeof table.entries !== "function"
  ) {
    refuse("requires an execution descriptor table");
  }
  input.assertOpen();

  const plans = new Map<string, CompiledExecutionPlan>();
  for (const plan of input.executionPlans) {
    if (!Check(CompiledExecutionPlanSchema, plan)) refuse("received an invalid compiled plan");
    if (plans.has(plan.ref.executionId)) refuse("contains duplicate compiled execution ids");
    plans.set(plan.ref.executionId, snapshotPlan(plan));
  }

  const descriptors = new Map<string, ErasedDescriptor>();
  const entries = table.entries();
  if (!Array.isArray(entries)) refuse("received invalid descriptor table entries");
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) refuse("received an invalid descriptor entry");
    const [ref, descriptor] = entry;
    assertRef(ref);
    if (descriptors.has(ref.executionId)) refuse("contains duplicate descriptor execution ids");
    const plan = plans.get(ref.executionId);
    if (plan === undefined || !sameRef(ref, plan.ref))
      refuse("descriptor has no exact compiled plan");
    assertDescriptor(plan, descriptor);
    if (table.get(ref) !== descriptor) refuse("descriptor table lookup and entries disagree");
    descriptors.set(ref.executionId, descriptor);
  }

  const boundaries = new Map<string, ErasedBoundary>();
  for (const entry of input.registryInput.boundaries) {
    if (entry.executionId !== entry.ref.executionId) refuse("input execution id and ref disagree");
    if (boundaries.has(entry.executionId)) refuse("contains duplicate executable boundaries");
    const plan = plans.get(entry.executionId);
    const descriptor = descriptors.get(entry.executionId);
    if (plan === undefined || descriptor === undefined || !sameRef(entry.ref, plan.ref)) {
      refuse("executable boundary has no exact plan and descriptor");
    }
    if (table.get(entry.ref) !== descriptor)
      refuse("executable ref resolves to another descriptor");
    const boundary: ErasedBoundary = {
      kind: "compiled.executable-boundary",
      ref: plan.ref,
      plan,
      descriptor,
      [boundaryWitness]: true,
    };
    Object.defineProperty(boundary, boundaryWitness, { enumerable: false });
    boundaries.set(entry.executionId, Object.freeze(boundary));
  }
  if (boundaries.size !== plans.size || boundaries.size !== descriptors.size) {
    refuse("is missing an executable boundary");
  }
  return new Registry(boundaries, input.assertOpen);
}

/** Private invocation admission rejects copied, foreign, and stale executable boundaries. */
export function readCompiledExecutableBoundary<TInput, TSuccess, TError, TContext>(
  registry: ExecutionRegistry,
  boundary: CompiledExecutableBoundary<TInput, TSuccess, TError, TContext>
): CompiledExecutableBoundary<TInput, TSuccess, TError, TContext> {
  return Registry.admit(registry, boundary);
}
