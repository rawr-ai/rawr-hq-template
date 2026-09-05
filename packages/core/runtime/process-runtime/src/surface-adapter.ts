import type { CompiledSurfacePlan } from "../../compiler/src/compiled-process-plan";
import type { AppRole } from "../../definition/src/app";
import type { RuntimeResourceMap } from "../../definition/src/provider";
import type { RuntimeSchema } from "../../definition/src/schema";
import type { ConstructionBoundServiceClient } from "../../definition/src/service";
import type { RuntimeServerSource } from "../../derivation/src/server-source";
import type { InngestMountPayload } from "./async-payload";
import type { ExecutionRegistry } from "./execution-registry";
import type { ProcessExecutionRuntime } from "./execution-runtime";
import type { ProcessRuntimeAccess, RoleRuntimeAccess } from "./runtime-access";
import type { NativeServerRequestAssembly } from "./server-request";

export type BoundServiceBindingMap = Readonly<Record<string, ConstructionBoundServiceClient>>;

export interface AdapterFinding {
  readonly code: string;
  readonly message: string;
  readonly severity: "error" | "warning";
}

export interface AdapterObservation {
  readonly kind: "surface.lowered";
  readonly surfacePlanId: string;
  readonly executionIds: readonly string[];
}

export interface AdapterLoweringResult<TPayload> {
  readonly payload: TPayload;
  readonly payloadSchemas: readonly RuntimeSchema[];
  readonly findings: readonly AdapterFinding[];
  readonly observations: readonly AdapterObservation[];
}

export interface SurfaceAdapter<
  TPlan extends CompiledSurfacePlan = CompiledSurfacePlan,
  TPayload = unknown,
> {
  readonly role: AppRole;
  readonly surface: string;
  readonly harness: string;
  lower(input: {
    readonly plan: TPlan;
    readonly processAccess: ProcessRuntimeAccess;
    readonly roleAccess: RoleRuntimeAccess;
    readonly serviceBindings: BoundServiceBindingMap;
    readonly resources: RuntimeResourceMap;
    readonly executionRegistry: ExecutionRegistry;
    readonly executionRuntime?: ProcessExecutionRuntime;
    readonly nativeAsync?: { bundle(): InngestMountPayload };
    readonly nativeServer?: {
      readonly source: RuntimeServerSource;
      readonly requests: NativeServerRequestAssembly;
    };
  }): AdapterLoweringResult<TPayload>;
}
