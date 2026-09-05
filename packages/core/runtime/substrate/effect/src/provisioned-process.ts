import { ReadonlyObject, type Static, Type } from "typebox";

import type { RuntimeCompilationResult } from "../../../compiler/src/compile-runtime-plan";
import { CompiledProcessPlanSchema } from "../../../compiler/src/compiled-process-plan";
import type { AppRole } from "../../../definition/src/app";
import type { RuntimeResourceMap } from "../../../definition/src/provider";
import type { PreflightConfig } from "./config";
import type { ManagedRuntimeHandle } from "./managed-runtime-handle";
import type { ProvisionedResourceValues } from "./provider-lifecycle";

export const ProvisioningFindingSchema = ReadonlyObject(
  Type.Object(
    {
      kind: Type.Literal("provisioning.finding"),
      code: Type.String(),
    },
    { additionalProperties: false }
  )
);
export type ProvisioningFinding = Static<typeof ProvisioningFindingSchema>;

export type RoleRuntimeResourceMap = Readonly<Partial<Record<AppRole, RuntimeResourceMap>>>;

const provisionedHandoff = Symbol("habitat.provisioned-process.handoff");

export interface ProvisionedProcessHandoff {
  readonly compilation: RuntimeCompilationResult;
  readonly values: ProvisionedResourceValues;
  readonly config: PreflightConfig;
  claim(): void;
}

export interface ProvisionedProcess {
  readonly kind: "provisioned.process";
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
  readonly managedRuntime: ManagedRuntimeHandle<ProvisionedResourceValues>;
  readonly processResources: RuntimeResourceMap;
  readonly roleResources: RoleRuntimeResourceMap;
  readonly findings: readonly ProvisioningFinding[];
  readonly [provisionedHandoff]: ProvisionedProcessHandoff;
}

const resourceMapSchema = Type.Refine(
  Type.Unknown(),
  (value): value is RuntimeResourceMap =>
    typeof value === "object" &&
    value !== null &&
    "has" in value &&
    typeof value.has === "function" &&
    "get" in value &&
    typeof value.get === "function"
);

export const ProvisionedProcessSchema = ReadonlyObject(
  Type.Object(
    {
      kind: Type.Literal("provisioned.process"),
      appId: Type.String(),
      processId: Type.String(),
      entrypointId: Type.String(),
      profileId: Type.String(),
      roles: Type.Index(CompiledProcessPlanSchema, ["roles"]),
      managedRuntime: Type.Refine(
        Type.Unknown(),
        (value): boolean =>
          typeof value === "object" &&
          value !== null &&
          "kind" in value &&
          value.kind === "managed-runtime.handle" &&
          "dispose" in value &&
          typeof value.dispose === "function"
      ),
      processResources: resourceMapSchema,
      roleResources: Type.Partial(
        Type.Object(
          {
            server: resourceMapSchema,
            async: resourceMapSchema,
            cli: resourceMapSchema,
            web: resourceMapSchema,
            agent: resourceMapSchema,
            desktop: resourceMapSchema,
          },
          { additionalProperties: false }
        )
      ),
      findings: Type.Array(ProvisioningFindingSchema),
    },
    { additionalProperties: false }
  )
);

export function attachProvisionedProcessHandoff(
  process: Omit<ProvisionedProcess, typeof provisionedHandoff>,
  handoff: Omit<ProvisionedProcessHandoff, "claim">
): ProvisionedProcess {
  let claimed = false;
  const result = Object.defineProperty(process, provisionedHandoff, {
    value: Object.freeze({
      ...handoff,
      claim(): void {
        if (claimed) throw new TypeError("Provisioned process already has a runtime owner.");
        claimed = true;
      },
    }),
    enumerable: false,
    writable: false,
    configurable: false,
  });
  return Object.freeze(result) as ProvisionedProcess;
}

export function readProvisionedProcessHandoff(
  process: ProvisionedProcess
): ProvisionedProcessHandoff {
  const handoff = process[provisionedHandoff];
  if (
    handoff === undefined ||
    handoff.compilation.plan.identity.process !== process.processId ||
    handoff.compilation.plan.identity.app !== process.appId ||
    handoff.compilation.plan.identity.entrypoint !== process.entrypointId ||
    handoff.compilation.plan.profileId !== process.profileId
  ) {
    throw new TypeError("Ready process lost its private provisioning handoff.");
  }
  return handoff;
}
