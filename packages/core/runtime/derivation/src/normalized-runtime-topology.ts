import { ReadonlyObject, type Static, Type } from "typebox";

import type {
  Entrypoint,
  ServiceDefinition,
  ServiceDependencyDeclaration,
} from "../../definition/src/index";
import { readServiceUse } from "../../definition/src/index";
import { RuntimeSchema } from "../../schema/src/index";

const closed = { additionalProperties: false } as const;

export const NormalizedAppRoleSchema = Type.Union([
  Type.Literal("server"),
  Type.Literal("async"),
  Type.Literal("cli"),
  Type.Literal("web"),
  Type.Literal("agent"),
  Type.Literal("desktop"),
]);

const NormalizedResourceLifetimeSchema = Type.Union([
  Type.Literal("process"),
  Type.Literal("role"),
]);

export const NormalizedRuntimeLaunchIdentitySchema = ReadonlyObject(
  Type.Object({
    app: Type.String(),
    process: Type.String(),
    entrypoint: Type.String(),
    deployment: Type.String(),
    source: Type.String(),
  }),
  closed
);

export const NormalizedPluginIdentitySchema = ReadonlyObject(
  Type.Object({
    pluginId: Type.String(),
    instance: Type.Optional(Type.String()),
  }),
  closed
);

export const NormalizedSurfaceRequirementSchema = ReadonlyObject(
  Type.Object({
    plugin: NormalizedPluginIdentitySchema,
    role: NormalizedAppRoleSchema,
    surface: Type.String(),
    capability: Type.String(),
  }),
  closed
);

export const NormalizedResourceRequirementIdentitySchema = ReadonlyObject(
  Type.Object({
    resourceId: Type.String(),
    lifetime: NormalizedResourceLifetimeSchema,
    role: Type.Optional(NormalizedAppRoleSchema),
    instance: Type.Optional(Type.String()),
  }),
  closed
);

export const NormalizedRuntimeTopologyEdgeSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("app.plugin"),
      appId: Type.String(),
      plugin: NormalizedPluginIdentitySchema,
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("plugin.resource"),
      plugin: NormalizedPluginIdentitySchema,
      resource: NormalizedResourceRequirementIdentitySchema,
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("service.service"),
      serviceId: Type.String(),
      dependencyServiceId: Type.String(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("service.resource"),
      serviceId: Type.String(),
      resourceId: Type.String(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("service.semantic"),
      serviceId: Type.String(),
      adapterId: Type.String(),
    }),
    closed
  ),
]);

export const NormalizedRuntimeTopologySchema = ReadonlyObject(
  Type.Object({
    identity: NormalizedRuntimeLaunchIdentitySchema,
    profileId: Type.String(),
    pluginIdentities: ReadonlyObject(Type.Array(NormalizedPluginIdentitySchema)),
    roleRequirements: ReadonlyObject(Type.Array(NormalizedAppRoleSchema)),
    surfaceRequirements: ReadonlyObject(Type.Array(NormalizedSurfaceRequirementSchema)),
    resourceRequirementIdentities: ReadonlyObject(
      Type.Array(NormalizedResourceRequirementIdentitySchema)
    ),
    edges: ReadonlyObject(Type.Array(NormalizedRuntimeTopologyEdgeSchema)),
  }),
  closed
);

export type NormalizedPluginIdentity = Static<typeof NormalizedPluginIdentitySchema>;
export type NormalizedSurfaceRequirement = Static<typeof NormalizedSurfaceRequirementSchema>;
export type NormalizedResourceRequirementIdentity = Static<
  typeof NormalizedResourceRequirementIdentitySchema
>;
export type NormalizedRuntimeTopologyEdge = Static<typeof NormalizedRuntimeTopologyEdgeSchema>;
export type NormalizedRuntimeTopology = Static<typeof NormalizedRuntimeTopologySchema>;

export const NormalizedRuntimeTopologyRuntimeSchema = RuntimeSchema.fromTypeBox(
  NormalizedRuntimeTopologySchema
);

type Tuple = readonly string[];

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTuples(left: Tuple, right: Tuple): number {
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const order = compareStrings(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }

  return 0;
}

function pluginTuple(plugin: NormalizedPluginIdentity): Tuple {
  return [plugin.pluginId, plugin.instance ?? ""];
}

function surfaceTuple(surface: NormalizedSurfaceRequirement): Tuple {
  return [
    surface.plugin.pluginId,
    surface.plugin.instance ?? "",
    surface.role,
    surface.surface,
    surface.capability,
  ];
}

function resourceTuple(resource: NormalizedResourceRequirementIdentity): Tuple {
  return [resource.resourceId, resource.lifetime, resource.role ?? "", resource.instance ?? ""];
}

function edgeTuple(edge: NormalizedRuntimeTopologyEdge): Tuple {
  switch (edge.kind) {
    case "app.plugin":
      return [edge.kind, edge.appId, edge.plugin.pluginId, edge.plugin.instance ?? ""];
    case "plugin.resource":
      return [
        edge.kind,
        edge.plugin.pluginId,
        edge.plugin.instance ?? "",
        edge.resource.resourceId,
        edge.resource.lifetime,
        edge.resource.role ?? "",
        edge.resource.instance ?? "",
      ];
    case "service.service":
      return [edge.kind, edge.serviceId, edge.dependencyServiceId];
    case "service.resource":
      return [edge.kind, edge.serviceId, edge.resourceId];
    case "service.semantic":
      return [edge.kind, edge.serviceId, edge.adapterId];
  }
}

function tupleKey(tuple: Tuple): string {
  return JSON.stringify(tuple);
}

function refuse(reason: string): never {
  throw new TypeError(`Runtime topology derivation refused: ${reason}.`);
}

function addUniqueTuple(seen: Set<string>, tuple: Tuple, subject: string): void {
  const key = tupleKey(tuple);
  if (seen.has(key)) refuse(`duplicate ${subject}`);
  seen.add(key);
}

function assertSelectedIdentity(entrypoint: Entrypoint, profileId: string): void {
  if (entrypoint.identity.app !== entrypoint.app.id) refuse("app identity mismatch");
  if (entrypoint.identity.process !== entrypoint.process.id) refuse("process identity mismatch");
  if (entrypoint.identity.entrypoint !== entrypoint.id) refuse("entrypoint identity mismatch");
  if (profileId !== entrypoint.profile.id) refuse("profile identity mismatch");
}

function assertAcyclicServiceEdges(edges: readonly NormalizedRuntimeTopologyEdge[]): void {
  const dependencies = new Map<string, Set<string>>();
  const incomingEdges = new Map<string, number>();

  for (const edge of edges) {
    if (edge.kind !== "service.service") continue;

    const serviceDependencies = dependencies.get(edge.serviceId) ?? new Set<string>();
    serviceDependencies.add(edge.dependencyServiceId);
    dependencies.set(edge.serviceId, serviceDependencies);
    incomingEdges.set(edge.serviceId, incomingEdges.get(edge.serviceId) ?? 0);
    incomingEdges.set(
      edge.dependencyServiceId,
      (incomingEdges.get(edge.dependencyServiceId) ?? 0) + 1
    );
    if (!dependencies.has(edge.dependencyServiceId)) {
      dependencies.set(edge.dependencyServiceId, new Set());
    }
  }

  const ready = [...incomingEdges]
    .filter(([, incoming]) => incoming === 0)
    .map(([serviceId]) => serviceId)
    .sort(compareStrings);
  let visited = 0;

  while (ready.length > 0) {
    const serviceId = ready.pop();
    if (serviceId === undefined) break;
    visited += 1;

    for (const dependencyServiceId of dependencies.get(serviceId) ?? []) {
      const remaining = (incomingEdges.get(dependencyServiceId) ?? 0) - 1;
      incomingEdges.set(dependencyServiceId, remaining);
      if (remaining === 0) ready.push(dependencyServiceId);
    }
  }

  if (visited !== incomingEdges.size) refuse("cyclic service dependencies");
}

function recursivelyCopyAndFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => recursivelyCopyAndFreeze(item))) as T;
  }

  if (value !== null && typeof value === "object") {
    const copy = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, recursivelyCopyAndFreeze(item)])
    );
    return Object.freeze(copy) as T;
  }

  return value;
}

function dependencyEdge(
  service: ServiceDefinition,
  dependency: ServiceDependencyDeclaration
): NormalizedRuntimeTopologyEdge {
  switch (dependency.kind) {
    case "service.dependency.service":
      return {
        kind: "service.service",
        serviceId: service.id,
        dependencyServiceId: dependency.service.id,
      };
    case "service.dependency.resource":
      return {
        kind: "service.resource",
        serviceId: service.id,
        resourceId: dependency.resource.id,
      };
    case "service.dependency.semantic":
      return {
        kind: "service.semantic",
        serviceId: service.id,
        adapterId: dependency.adapterId,
      };
  }
}

/** Derives the private, topology-only runtime-derivation@1 artifact. */
export function deriveNormalizedRuntimeTopology(input: {
  readonly entrypoint: Entrypoint;
  readonly profileId: string;
}): NormalizedRuntimeTopology {
  const { entrypoint, profileId } = input;
  assertSelectedIdentity(entrypoint, profileId);

  const pluginIdentities: NormalizedPluginIdentity[] = [];
  const roleRequirements = [...entrypoint.process.roles];
  const surfaceRequirements: NormalizedSurfaceRequirement[] = [];
  const edges: NormalizedRuntimeTopologyEdge[] = [];
  const pluginKeys = new Set<string>();
  const roleKeys = new Set<string>();
  const surfaceKeys = new Set<string>();
  const edgeKeys = new Set<string>();

  const addEdge = (edge: NormalizedRuntimeTopologyEdge): void => {
    addUniqueTuple(edgeKeys, edgeTuple(edge), "topology edge");
    edges.push(edge);
  };

  for (const role of roleRequirements) {
    addUniqueTuple(roleKeys, [role], "process role");
  }

  const serviceRoots: ServiceDefinition[] = [];

  for (const plugin of entrypoint.app.plugins) {
    const pluginIdentity: NormalizedPluginIdentity = {
      pluginId: plugin.id,
      ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
    };
    addUniqueTuple(pluginKeys, pluginTuple(pluginIdentity), "plugin identity");
    pluginIdentities.push(pluginIdentity);

    const surfaceRequirement: NormalizedSurfaceRequirement = {
      plugin: pluginIdentity,
      role: plugin.role,
      surface: plugin.surface,
      capability: plugin.capability,
    };
    addUniqueTuple(surfaceKeys, surfaceTuple(surfaceRequirement), "surface requirement");
    surfaceRequirements.push(surfaceRequirement);

    addEdge({ kind: "app.plugin", appId: entrypoint.app.id, plugin: pluginIdentity });

    for (const requirement of plugin.resourceRequirements) {
      const resource: NormalizedResourceRequirementIdentity = {
        resourceId: requirement.resource.id,
        lifetime: requirement.lifetime ?? requirement.resource.defaultLifetime,
        ...(requirement.role === undefined ? {} : { role: requirement.role }),
        ...(requirement.instance === undefined ? {} : { instance: requirement.instance }),
      };
      addEdge({ kind: "plugin.resource", plugin: pluginIdentity, resource });
    }

    for (const serviceUse of Object.values(plugin.services)) {
      serviceRoots.push(readServiceUse(serviceUse).definition);
    }
  }

  const pendingServices = [...serviceRoots];
  const visitedServices = new WeakSet<ServiceDefinition>();

  while (pendingServices.length > 0) {
    const service = pendingServices.pop();
    if (service === undefined || visitedServices.has(service)) continue;
    visitedServices.add(service);

    for (const dependency of Object.values(service.deps)) {
      addEdge(dependencyEdge(service, dependency));
      if (dependency.kind === "service.dependency.service") {
        pendingServices.push(dependency.service);
      }
    }
  }

  assertAcyclicServiceEdges(edges);

  pluginIdentities.sort((left, right) => compareTuples(pluginTuple(left), pluginTuple(right)));
  roleRequirements.sort(compareStrings);
  surfaceRequirements.sort((left, right) => compareTuples(surfaceTuple(left), surfaceTuple(right)));
  edges.sort((left, right) => compareTuples(edgeTuple(left), edgeTuple(right)));
  const resourceRequirementIdentities = new Map<string, NormalizedResourceRequirementIdentity>();
  for (const edge of edges) {
    if (edge.kind !== "plugin.resource") continue;
    const key = tupleKey(resourceTuple(edge.resource));
    if (!resourceRequirementIdentities.has(key)) {
      resourceRequirementIdentities.set(key, edge.resource);
    }
  }
  const sortedResourceRequirements = [...resourceRequirementIdentities.values()].sort(
    (left, right) => compareTuples(resourceTuple(left), resourceTuple(right))
  );

  return recursivelyCopyAndFreeze({
    identity: {
      app: entrypoint.identity.app,
      process: entrypoint.identity.process,
      entrypoint: entrypoint.identity.entrypoint,
      deployment: entrypoint.identity.deployment,
      source: entrypoint.identity.source,
    },
    profileId,
    pluginIdentities,
    roleRequirements,
    surfaceRequirements,
    resourceRequirementIdentities: sortedResourceRequirements,
    edges,
  });
}
