import type { RuntimeCompilationResult } from "../../compiler/src/index";
import type { AppRole, RuntimeResource, RuntimeResourceValue } from "../../definition/src/index";
import {
  type ProvisionedProcess,
  readProvisionedProcessHandoff,
} from "../../substrate/effect/src/index";
import type { InvocationTracker } from "./invocation-tracker";

interface ResourceAccess {
  resource<R extends RuntimeResource>(
    resource: R,
    input?: { instance?: string }
  ): RuntimeResourceValue<R>;
  optionalResource<R extends RuntimeResource>(
    resource: R,
    input?: { instance?: string }
  ): RuntimeResourceValue<R> | undefined;
}

export interface ProcessRuntimeAccess extends ResourceAccess {
  readonly appId: string;
  readonly processId: string;
  readonly entrypointId: string;
  readonly profileId: string;
  readonly roles: readonly AppRole[];
}

export interface RoleSurfaceIdentity {
  readonly surface: string;
  readonly capability: string;
  readonly instance?: string;
}

export interface SurfaceRuntimeAccess extends RoleSurfaceIdentity {
  readonly role: AppRole;
  readonly roleAccess: RoleRuntimeAccess;
}

export interface RoleRuntimeAccess extends ResourceAccess {
  readonly role: AppRole;
  readonly process: ProcessRuntimeAccess;
  readonly selectedSurfaces: readonly RoleSurfaceIdentity[];
  forSurface(input: RoleSurfaceIdentity): SurfaceRuntimeAccess;
}

export interface RuntimeAccess {
  readonly process: ProcessRuntimeAccess;
  readonly roles: ReadonlyMap<AppRole, RoleRuntimeAccess>;
}

export function createRuntimeAccess(
  compilation: RuntimeCompilationResult,
  provisioned: ProvisionedProcess,
  admission: InvocationTracker
): RuntimeAccess {
  const { values } = readProvisionedProcessHandoff(provisioned);
  const { plan } = compilation;

  function access(role?: AppRole): ResourceAccess {
    const candidates = plan.compiledResources.filter(({ resource }) =>
      role === undefined
        ? resource.lifetime === "process"
        : resource.role === undefined || resource.role === role
    );
    function lookup<R extends RuntimeResource>(resource: R, instance?: string) {
      admission.assertOpen();
      const matches = candidates.filter(
        (candidate) =>
          candidate.resource.resourceId === resource.id && candidate.resource.instance === instance
      );
      if (matches.length > 1)
        throw new TypeError("Resource access is ambiguous in this runtime projection.");
      return matches[0];
    }
    return {
      resource<R extends RuntimeResource>(
        resource: R,
        input?: { instance?: string }
      ): RuntimeResourceValue<R> {
        const match = lookup(resource, input?.instance);
        if (match === undefined)
          throw new TypeError("Required resource is outside this runtime projection.");
        return values.get(match.selectionId) as RuntimeResourceValue<R>;
      },
      optionalResource<R extends RuntimeResource>(
        resource: R,
        input?: { instance?: string }
      ): RuntimeResourceValue<R> | undefined {
        const match = lookup(resource, input?.instance);
        return match === undefined
          ? undefined
          : (values.get(match.selectionId) as RuntimeResourceValue<R>);
      },
    };
  }

  const process: ProcessRuntimeAccess = Object.freeze({
    appId: plan.identity.app,
    processId: plan.identity.process,
    entrypointId: plan.identity.entrypoint,
    profileId: plan.profileId,
    roles: plan.roles,
    ...access(),
  });
  const roles = new Map<AppRole, RoleRuntimeAccess>();
  for (const role of plan.roles) {
    const selectedSurfaces = Object.freeze(
      plan.surfaces
        .filter((surface) => surface.role === role)
        .map(({ surface, capability, instance }) =>
          Object.freeze({ surface, capability, ...(instance === undefined ? {} : { instance }) })
        )
    );
    const roleAccess: RoleRuntimeAccess = Object.freeze({
      role,
      process,
      selectedSurfaces,
      ...access(role),
      forSurface(input: RoleSurfaceIdentity): SurfaceRuntimeAccess {
        admission.assertOpen();
        if (
          !selectedSurfaces.some(
            (selected) =>
              selected.surface === input.surface &&
              selected.capability === input.capability &&
              selected.instance === input.instance
          )
        )
          throw new TypeError("Surface is outside this selected role.");
        return Object.freeze({
          role,
          surface: input.surface,
          capability: input.capability,
          ...(input.instance === undefined ? {} : { instance: input.instance }),
          roleAccess,
        });
      },
    });
    roles.set(role, roleAccess);
  }
  return Object.freeze({ process, roles });
}
