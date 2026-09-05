import { ReadonlyObject, type Static, Type } from "typebox";
import { Check } from "typebox/value";

import {
  type CompiledProcessPlan,
  CompiledProcessPlanSchema,
  type CompiledSurfacePlan,
  CompiledSurfacePlanSchema,
} from "../../compiler/src/compiled-process-plan";
import type { RuntimeLaunchIdentity } from "../../definition/src/app";
import type { RuntimeSchema } from "../../definition/src/schema";
import type { ProcessRuntimeAccess } from "./runtime-access";
import type {
  AdapterFinding,
  AdapterLoweringResult,
  AdapterObservation,
  SurfaceAdapter,
} from "./surface-adapter";

const findingSchema = ReadonlyObject(
  Type.Object(
    {
      code: Type.String(),
      message: Type.String(),
      severity: Type.Union([Type.Literal("info"), Type.Literal("warning"), Type.Literal("error")]),
    },
    { additionalProperties: false }
  )
);
const identitySchema = Type.Index(CompiledProcessPlanSchema, ["identity"]);
const identityFields = ["app", "process", "entrypoint", "deployment", "source"] as const;

function assertArray(value: unknown): void {
  if (!Array.isArray(value)) throw new TypeError("Mount-ready metadata must contain arrays.");
}

export const MountResourceReadinessSchema = ReadonlyObject(
  Type.Object(
    {
      ready: Type.Boolean(),
      resources: ReadonlyObject(
        Type.Array(
          ReadonlyObject(
            Type.Object(
              {
                resource: Type.String(),
                ready: Type.Boolean(),
                findings: ReadonlyObject(Type.Array(findingSchema)),
              },
              { additionalProperties: false }
            )
          )
        )
      ),
    },
    { additionalProperties: false }
  )
);

export type MountResourceReadiness = Static<typeof MountResourceReadinessSchema>;

export const MountReadySurfaceMetadataSchema = ReadonlyObject(
  Type.Object(
    {
      kind: Type.Literal("runtime.mount-ready-surface"),
      surfacePlanId: Type.Index(CompiledSurfacePlanSchema, ["surfacePlanId"]),
      pluginOwnerId: Type.Index(CompiledSurfacePlanSchema, ["pluginOwnerId"]),
      role: Type.Index(CompiledSurfacePlanSchema, ["role"]),
      surface: Type.Index(CompiledSurfacePlanSchema, ["surface"]),
      capability: Type.Index(CompiledSurfacePlanSchema, ["capability"]),
      instance: Type.Optional(Type.String()),
      harnessId: Type.String(),
      serviceBindings: ReadonlyObject(Type.Index(CompiledSurfacePlanSchema, ["serviceBindings"])),
    },
    { additionalProperties: false }
  )
);

export interface MountReadySurfaceRuntimeRecord<TPayload = unknown>
  extends Static<typeof MountReadySurfaceMetadataSchema> {
  readonly payload: TPayload;
  readonly payloadSchemas: readonly RuntimeSchema[];
  readonly findings: readonly AdapterFinding[];
  readonly observations: readonly AdapterObservation[];
}

export interface SurfaceMountAssignment<TPayload = unknown> {
  readonly surface: CompiledSurfacePlan;
  readonly adapter: SurfaceAdapter<CompiledSurfacePlan, TPayload>;
}

export interface PrepareMountsInput<TPayload = unknown> {
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly assignments: readonly SurfaceMountAssignment<TPayload>[];
}

const mountReadyHandoff = Symbol("habitat.mount-ready-process.handoff");

export interface MountReadyProcess<TPayload = unknown> {
  readonly kind: "runtime.mount-ready-process";
  readonly identity: RuntimeLaunchIdentity;
  readonly profileId: string;
  readonly roles: CompiledProcessPlan["roles"];
  readonly harnessIds: readonly string[];
  readonly records: readonly MountReadySurfaceRuntimeRecord<TPayload>[];
  readonly processAccess: ProcessRuntimeAccess;
  readonly requiredResources: MountResourceReadiness;
  readonly findings: readonly AdapterFinding[];
  readonly observations: readonly AdapterObservation[];
  closeAdmission(): void;
  stop(): Promise<void>;
  readonly [mountReadyHandoff]: MountReadyProcessHandoff;
}

export interface MountReadyProcessHandoff {
  readonly process: MountReadyProcess;
  claim(): void;
}

export function readMountReadyProcessHandoff(process: MountReadyProcess): MountReadyProcessHandoff {
  const handoff = process?.[mountReadyHandoff];
  if (handoff === undefined || handoff.process !== process)
    throw new TypeError("Mount-ready process lost its exact ownership handoff.");
  return handoff;
}

export function readMountReadySurfaceRuntimeRecord<TPayload>(
  process: MountReadyProcess<TPayload>,
  record: MountReadySurfaceRuntimeRecord<TPayload>
): MountReadySurfaceRuntimeRecord<TPayload> {
  readMountReadyProcessHandoff(process);
  if (!process.records.includes(record))
    throw new TypeError("Mount-ready surface is outside this process handoff.");
  return record;
}

function attachMountReadyHandoff<TPayload>(
  data: Omit<MountReadyProcess<TPayload>, typeof mountReadyHandoff>,
  assertOpen: () => void
): MountReadyProcess<TPayload> {
  const process = data as MountReadyProcess<TPayload>;
  let claimed = false;
  Object.defineProperty(process, mountReadyHandoff, {
    value: Object.freeze({
      process,
      claim(): void {
        assertOpen();
        if (claimed) throw new TypeError("Mount-ready process already has a mounting owner.");
        claimed = true;
      },
    }),
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(process);
}

function requiredResourceReadiness(
  plan: CompiledProcessPlan,
  hasSelection: (selectionId: string) => boolean,
  requiresHealth: (selectionId: string) => boolean
): MountResourceReadiness {
  const requirements = new Map<string, { selectionId: string; requiresHealth: boolean }>();
  for (const resource of plan.compiledResources) {
    const selection = {
      selectionId: resource.selectionId,
      requiresHealth: requiresHealth(resource.selectionId),
    };
    for (const requirementId of resource.requirementIds) {
      if (requirements.has(requirementId))
        throw new TypeError("Mount readiness contains ambiguous resource coverage.");
      requirements.set(requirementId, selection);
    }
  }
  const resources = plan.resourceRequirements.flatMap((requirement) => {
    const selection = requirements.get(requirement.requirementId);
    if (requirement.optional && selection?.requiresHealth !== true) return [];
    if (selection === undefined || !hasSelection(selection.selectionId))
      throw new TypeError("A required mount resource has not been acquired.");
    // Acquisition proves availability, not an explicitly required health check.
    const findings = selection.requiresHealth
      ? [
          Object.freeze({
            code: "provider.health.unknown",
            message: "Explicitly required provider health has no admitted evidence.",
            severity: "error" as const,
          }),
        ]
      : [];
    // Full requirement identity keeps role, lifetime and named instances distinct.
    return [
      Object.freeze({
        resource: requirement.requirementId,
        ready: !selection.requiresHealth,
        findings: Object.freeze(findings),
      }),
    ];
  });
  return Object.freeze({
    ready: resources.every((resource) => resource.ready),
    resources: Object.freeze(resources),
  });
}

function copyLoweringResult<TPayload>(
  surface: CompiledSurfacePlan,
  result: AdapterLoweringResult<TPayload>
): AdapterLoweringResult<TPayload> {
  assertArray(result.payloadSchemas);
  assertArray(result.findings);
  assertArray(result.observations);
  for (const schema of result.payloadSchemas) {
    if (
      schema?.kind !== "runtime.schema" ||
      typeof schema.decode !== "function" ||
      typeof schema.validate !== "function"
    )
      throw new TypeError("Adapter payload schema is not a runtime schema.");
  }
  const findings = result.findings.map((finding) => {
    if (!Check(findingSchema, finding) || !["warning", "error"].includes(finding.severity))
      throw new TypeError("Adapter returned an invalid finding.");
    return Object.freeze({ ...finding });
  });
  const executions = new Set(surface.executionDescriptorRefs.map((ref) => ref.executionId));
  const observations = result.observations.map((observation) => {
    assertArray(observation.executionIds);
    if (
      observation.kind !== "surface.lowered" ||
      observation.surfacePlanId !== surface.surfacePlanId ||
      observation.executionIds.some((id) => !executions.has(id))
    )
      throw new TypeError("Adapter observation belongs to another surface or execution.");
    return Object.freeze({
      kind: observation.kind,
      surfacePlanId: observation.surfacePlanId,
      executionIds: Object.freeze([...observation.executionIds]),
    });
  });
  return Object.freeze({
    payload: result.payload,
    payloadSchemas: Object.freeze([...result.payloadSchemas]),
    findings: Object.freeze(findings),
    observations: Object.freeze(observations),
  });
}

/** One successful preflight reserves this process for one downstream mounting owner. */
export function createMountPreparation(input: {
  readonly plan: CompiledProcessPlan;
  readonly processAccess: ProcessRuntimeAccess;
  readonly hasSelection: (selectionId: string) => boolean;
  readonly requiresHealth: (selectionId: string) => boolean;
  readonly assertOpen: () => void;
  readonly lower: <T>(
    surface: CompiledSurfacePlan,
    adapter: SurfaceAdapter<CompiledSurfacePlan, T>
  ) => AdapterLoweringResult<T>;
  readonly closeAdmission: () => void;
  readonly stop: () => Promise<void>;
}): <T>(request: PrepareMountsInput<T>) => MountReadyProcess<T> {
  let reserved = false;
  return <T>(request: PrepareMountsInput<T>): MountReadyProcess<T> => {
    input.assertOpen();
    if (reserved) throw new TypeError("Process mount preparation already has an owner.");
    const identity = request.launchIdentity;
    const prototype =
      typeof identity === "object" && identity !== null
        ? Object.getPrototypeOf(identity)
        : undefined;
    if (
      (prototype !== Object.prototype && prototype !== null) ||
      !Object.isFrozen(identity) ||
      Reflect.ownKeys(identity).length !== identityFields.length ||
      identityFields.some(
        (key) => !Object.hasOwn(Object.getOwnPropertyDescriptor(identity, key) ?? {}, "value")
      ) ||
      !Check(identitySchema, identity) ||
      identityFields.some((key) => identity[key] !== input.plan.identity[key])
    )
      throw new TypeError("Mount preparation requires the exact frozen launch identity.");
    assertArray(request.assignments);
    const harnessIds = input.plan.harnesses.map((harness) => harness.harnessId);
    const selectedHarnesses = new Set(harnessIds);
    const covered = new Set<CompiledSurfacePlan>();
    const pairs = new Map<CompiledSurfacePlan, Set<string>>();
    const assignments = request.assignments.map(({ surface, adapter }) => {
      const { role, surface: adapterSurface, harness, lower } = adapter;
      if (
        !input.plan.surfaces.includes(surface) ||
        role !== surface.role ||
        adapterSurface !== surface.surface ||
        typeof lower !== "function" ||
        !selectedHarnesses.has(harness)
      )
        throw new TypeError(
          "Mount assignment requires an exact selected surface, adapter and harness."
        );
      const harnesses = pairs.get(surface) ?? new Set<string>();
      if (harnesses.has(harness)) throw new TypeError("Mount assignment is duplicated.");
      harnesses.add(harness);
      pairs.set(surface, harnesses);
      covered.add(surface);
      return {
        surface,
        adapter,
        lower,
        metadata: {
          kind: "runtime.mount-ready-surface" as const,
          surfacePlanId: surface.surfacePlanId,
          pluginOwnerId: surface.pluginOwnerId,
          role,
          surface: adapterSurface,
          capability: surface.capability,
          ...(surface.instance === undefined ? {} : { instance: surface.instance }),
          harnessId: harness,
          serviceBindings: Object.freeze(
            surface.serviceBindings.map((binding) => Object.freeze({ ...binding }))
          ),
        },
      };
    });
    if (covered.size !== input.plan.surfaces.length)
      throw new TypeError("Mount assignments do not cover every selected surface.");
    const requiredResources = requiredResourceReadiness(
      input.plan,
      input.hasSelection,
      input.requiresHealth
    );
    reserved = true;
    assignments.sort((left, right) => {
      const a = [left.metadata.harnessId, left.metadata.surfacePlanId];
      const b = [right.metadata.harnessId, right.metadata.surfacePlanId];
      return a[0]! < b[0]! ? -1 : a[0]! > b[0]! ? 1 : a[1]! < b[1]! ? -1 : a[1]! > b[1]! ? 1 : 0;
    });
    const records = Object.freeze(
      assignments.map(({ surface, adapter, lower, metadata }) => {
        // An earlier trusted callback must not retarget a later admitted assignment.
        if (
          adapter.role !== metadata.role ||
          adapter.surface !== metadata.surface ||
          adapter.harness !== metadata.harnessId ||
          adapter.lower !== lower
        )
          throw new TypeError("Mount adapter changed after assignment preflight.");
        return Object.freeze({
          ...metadata,
          ...copyLoweringResult(surface, input.lower(surface, adapter)),
        });
      })
    );
    return attachMountReadyHandoff(
      {
        kind: "runtime.mount-ready-process" as const,
        identity,
        profileId: input.plan.profileId,
        roles: Object.freeze([...input.plan.roles]),
        harnessIds: Object.freeze(harnessIds),
        records,
        processAccess: input.processAccess,
        requiredResources,
        findings: Object.freeze(records.flatMap((record) => record.findings)),
        observations: Object.freeze(records.flatMap((record) => record.observations)),
        closeAdmission: input.closeAdmission,
        stop: input.stop,
      },
      input.assertOpen
    );
  };
}
