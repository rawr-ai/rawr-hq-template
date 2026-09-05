import type { Exit } from "effect";

import type { AppRole } from "./app";
import type { HabitatEffect } from "./effect";

export interface EffectBoundaryContext {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly role: AppRole;
  readonly surface?: string;
  readonly capability?: string;
  readonly ownerId: string;
  readonly executionId: string;
  readonly requestId?: string;
  readonly traceId: string;
}

export interface BoundaryTelemetry {
  span<A, E, R>(
    name: string,
    effect: HabitatEffect<A, E, R>,
    attributes?: Readonly<Record<string, string | number | boolean>>
  ): HabitatEffect<A, E, R>;
  event(
    name: string,
    attributes?: Readonly<Record<string, string | number | boolean | null>>
  ): HabitatEffect<void>;
}

export interface ProcedureExecutionContext<Input, BoundaryContext> {
  readonly input: Input;
  readonly context: BoundaryContext;
  readonly telemetry: BoundaryTelemetry;
  readonly execution: EffectBoundaryContext;
}

/** Native Cause retains failures, defects, interruption and combined reasons without remapping. */
export type EffectExecutionExit<A, E> = Exit.Exit<A, E>;
