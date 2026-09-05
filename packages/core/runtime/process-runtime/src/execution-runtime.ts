import { Clock, Effect, Tracer } from "effect";
import { ReadonlyObject, type Static, Type } from "typebox";
import { Check } from "typebox/value";

import type { CompiledSurfacePlan, RuntimeCompilationResult } from "../../compiler/src/index";
import type {
  BoundaryTelemetry,
  EffectExecutionExit,
  HabitatTimeoutError,
  ProcedureExecutionContext,
} from "../../definition/src/index";
import {
  applyExecutionPolicy,
  type ProvisionedProcess,
  type ProvisionedResourceValues,
} from "../../substrate/effect/src/index";
import {
  type CompiledExecutableBoundary,
  type ExecutionRegistry,
  readCompiledExecutableBoundary,
} from "./execution-registry";
import {
  type Continuation,
  type InvocationTracker,
  invocationContinuationContext,
} from "./invocation-tracker";
import type { createSurfaceCapabilities } from "./surface-capabilities";

export const ExecutionTraceParentSchema = ReadonlyObject(
  Type.Object(
    {
      traceId: Type.String({ pattern: "^(?!0{32}$)[0-9a-f]{32}$" }),
      spanId: Type.String({ pattern: "^(?!0{16}$)[0-9a-f]{16}$" }),
      sampled: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false }
  )
);
export type ExecutionTraceParent = Static<typeof ExecutionTraceParentSchema>;

export interface ProcessExecutionInvocation<Input, Context> {
  readonly input: Input;
  readonly context: Context;
  readonly requestId?: string;
  readonly parentSpan?: ExecutionTraceParent;
  readonly signal?: AbortSignal;
}

export interface ProcessExecutionInput<I, A, E, C> {
  readonly boundary: CompiledExecutableBoundary<I, A, E, C>;
  readonly invocation: ProcessExecutionInvocation<I, C>;
}

export interface ProcessExecutionRuntime {
  execute<I, A, E, C>(input: ProcessExecutionInput<I, A, E, C>): Promise<A>;
  executeExit<I, A, E, C>(
    input: ProcessExecutionInput<I, A, E, C>
  ): Promise<EffectExecutionExit<A, E | HabitatTimeoutError>>;
}

const telemetry: BoundaryTelemetry = Object.freeze({
  span: <A, E, R>(
    name: string,
    program: Effect.Effect<A, E, R>,
    attributes?: Readonly<Record<string, string | number | boolean>>
  ) => Effect.withSpan(program, name, { attributes }),
  event: (name: string, attributes?: Readonly<Record<string, string | number | boolean | null>>) =>
    Effect.gen(function* () {
      const span = yield* Effect.currentSpan;
      const time = yield* Clock.currentTimeNanos;
      span.event(name, time, attributes);
    }).pipe(Effect.catchCause(() => Effect.void)),
});

export function createProcessExecutionRuntime(input: {
  readonly compilation: RuntimeCompilationResult;
  readonly provisioned: ProvisionedProcess;
  readonly registry: ExecutionRegistry;
  readonly admission: InvocationTracker;
  readonly surfaceCapabilities: (
    surface: CompiledSurfacePlan,
    continuation: Continuation
  ) => ReturnType<typeof createSurfaceCapabilities>;
}): ProcessExecutionRuntime {
  function prepare<I, A, E, C>(
    request: ProcessExecutionInput<I, A, E, C>,
    continuation: Continuation
  ) {
    const boundary = readCompiledExecutableBoundary(input.registry, request.boundary);
    const invocation = request.invocation;
    const surface = input.compilation.plan.surfaces.find(
      (candidate) =>
        candidate.pluginOwnerId === boundary.ref.ownerId &&
        candidate.executionDescriptorRefs.some(
          (ref) => ref.executionId === boundary.ref.executionId
        )
    );
    if (surface === undefined)
      throw new TypeError("Executable boundary is outside the selected process surfaces.");
    if (boundary.ref.boundary === "plugin.async-step" && invocation.signal !== undefined) {
      throw new TypeError("Native async steps do not accept a synthetic interruption signal.");
    }
    if (
      invocation.parentSpan !== undefined &&
      !Check(ExecutionTraceParentSchema, invocation.parentSpan)
    ) {
      throw new TypeError("Execution received an invalid native trace parent.");
    }
    const { identity, profileId } = input.compilation.plan;
    const program = Effect.gen(function* () {
      const span = yield* Effect.orDie(Effect.currentSpan);
      const context: ProcedureExecutionContext<I, C> = {
        input: invocation.input,
        context: (boundary.ref.boundary === "plugin.agent-tool" ||
        boundary.ref.boundary === "plugin.desktop-background" ||
        boundary.ref.boundary === "plugin.cli-command"
          ? { ...invocation.context, ...input.surfaceCapabilities(surface, continuation) }
          : invocation.context) as C,
        execution: Object.freeze({
          appId: identity.app,
          processId: identity.process,
          entrypointId: identity.entrypoint,
          profileId,
          role: surface.role,
          surface: surface.surface,
          capability: surface.capability,
          ownerId: boundary.ref.ownerId,
          executionId: boundary.ref.executionId,
          ...(invocation.requestId === undefined ? {} : { requestId: invocation.requestId }),
          traceId: span.traceId,
        }),
        telemetry,
      };
      // One invocation constructs one cold program; native policy may evaluate it repeatedly.
      const body = boundary.descriptor.run(context);
      if (!Effect.isEffect(body))
        throw new TypeError("Execution descriptor returned a non-Effect value.");
      return yield* applyExecutionPolicy(body, boundary.plan.policy);
    }).pipe(
      Effect.withSpan("runtime.execution", {
        attributes: {
          "habitat.app": identity.app,
          "habitat.process": identity.process,
          "habitat.execution": boundary.ref.executionId,
        },
        ...(invocation.parentSpan === undefined
          ? {}
          : { parent: Tracer.externalSpan(invocation.parentSpan) }),
      })
    );
    // The cold descriptor table erases R. Native Effect still refuses any unavailable requirement.
    return program as Effect.Effect<A, E | HabitatTimeoutError, ProvisionedResourceValues>;
  }

  return Object.freeze<ProcessExecutionRuntime>({
    execute(request) {
      return input.admission.run((lease) =>
        input.provisioned.managedRuntime.run(
          Effect.provideContext(prepare(request, lease), invocationContinuationContext(lease)),
          { signal: request.invocation.signal }
        )
      );
    },
    executeExit(request) {
      return input.admission.runExit((lease) =>
        input.provisioned.managedRuntime.runExit(
          Effect.provideContext(prepare(request, lease), invocationContinuationContext(lease)),
          { signal: request.invocation.signal }
        )
      );
    },
  });
}
