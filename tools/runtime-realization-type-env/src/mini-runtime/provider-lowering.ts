import { Effect as VendorEffect, Exit } from "effect";
import type { RawrEffect } from "../sdk/effect";
import { readProviderEffectPlanInternals } from "../sdk/runtime/provider-plan-internals";
import type { ProviderSelection } from "../sdk/runtime/profiles";
import type { RuntimeProvider, RuntimeResourceMap } from "../sdk/runtime/providers";
import type {
  AppRole,
  ResourceLifetime,
  ResourceRequirement,
} from "../sdk/runtime/resources";
import type {
  ProviderDependencyGraph,
  ProviderDependencyGraphEdge,
  ProviderDependencyGraphNode,
} from "../spine/artifacts";
import type { EffectRuntimeAccess } from "./managed-runtime";
import { runRawrEffectExit } from "./managed-runtime";
import type { MiniBootgraphModule } from "./bootgraph";

export interface ProviderBootResourceKey {
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface ProviderProvisioningEvent {
  readonly name: string;
  readonly attributes?: Record<string, string | number | boolean>;
}

export interface ProviderProvisioningDiagnostic {
  readonly message: string;
}

export interface ProviderProvisioningTrace {
  readonly events: ProviderProvisioningEvent[];
  readonly diagnostics: ProviderProvisioningDiagnostic[];
}

export interface ProviderProvisionedValue<TValue = unknown> {
  readonly kind: "provider.provisioned-value";
  readonly key: ProviderBootResourceKey;
  readonly value: TValue;
  /**
   * Live finalizer handle carried only by the started boot module value. Catalog
   * and diagnostic records must keep this out of persisted observation data.
   */
  readonly release?: (value: TValue) => RawrEffect<void, unknown, never>;
  readonly events: readonly ProviderProvisioningEvent[];
  readonly diagnostics: readonly ProviderProvisioningDiagnostic[];
}

export type ProviderConfigMap =
  | ReadonlyMap<string, unknown>
  | { readonly [key: string]: unknown };

export interface ProviderProvisioningModulesInput {
  readonly profileId: string;
  readonly providerSelections: readonly ProviderSelection[];
  readonly providerDependencyGraph?: ProviderDependencyGraph;
  readonly configs?: ProviderConfigMap;
  readonly processId: string;
  readonly effectRuntime?: EffectRuntimeAccess;
  readonly trace?: ProviderProvisioningTrace;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableJson(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

export function providerBootResourceKey(input: {
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}): ProviderBootResourceKey {
  return {
    resourceId: input.resourceId,
    providerId: input.providerId,
    lifetime: input.lifetime,
    role: input.role,
    instance: input.instance,
  };
}

/**
 * Preserves full provider identity until the final production ID law exists.
 * Collapsing any field can route dependencies to the wrong provisioned value.
 */
export function providerBootResourceModuleId(key: ProviderBootResourceKey): string {
  return `provider:${stableJson({
    instance: key.instance ?? null,
    lifetime: key.lifetime,
    providerId: key.providerId,
    resourceId: key.resourceId,
    role: key.role ?? null,
  })}`;
}

export function createProviderProvisioningTrace(): ProviderProvisioningTrace {
  return {
    events: [],
    diagnostics: [],
  };
}

const defaultEffectRuntime = {
  kind: "effect.runtime-access",
  runPromiseExit: runRawrEffectExit,
  async dispose() {},
} satisfies EffectRuntimeAccess;

function selectedProviderKey(selection: ProviderSelection): ProviderBootResourceKey {
  return providerBootResourceKey({
    resourceId: selection.resource.id,
    providerId: selection.provider.id,
    lifetime: selection.lifetime,
    role: selection.role,
    instance: selection.instance,
  });
}

function providerDependencyNodeKey(node: ProviderDependencyGraphNode): ProviderBootResourceKey {
  return providerBootResourceKey({
    resourceId: node.resourceId,
    providerId: node.providerId,
    lifetime: node.lifetime,
    role: node.role,
    instance: node.instance,
  });
}

function configFor(
  configs: ProviderConfigMap | undefined,
  key: ProviderBootResourceKey,
): unknown {
  if (!configs) return {};

  const moduleId = providerBootResourceModuleId(key);
  if (isReadonlyMap(configs)) {
    return configs.get(moduleId) ?? configs.get(key.providerId) ?? {};
  }

  const configRecord = configs as { readonly [key: string]: unknown };
  return configRecord[moduleId] ?? configRecord[key.providerId] ?? {};
}

function isReadonlyMap(value: ProviderConfigMap): value is ReadonlyMap<string, unknown> {
  return typeof (value as ReadonlyMap<string, unknown>).get === "function";
}

function roleMatches(candidateRole: AppRole | undefined, expectedRole: AppRole | undefined) {
  if (expectedRole === undefined) return candidateRole === undefined;
  return candidateRole === expectedRole || candidateRole === undefined;
}

function lifetimeMatches(
  candidateLifetime: ResourceLifetime,
  expectedLifetime: ResourceLifetime | undefined,
): boolean {
  return expectedLifetime === undefined || candidateLifetime === expectedLifetime;
}

function instanceMatches(
  candidateInstance: string | undefined,
  expectedInstance: string | undefined,
): boolean {
  return expectedInstance === undefined
    ? candidateInstance === undefined
    : candidateInstance === expectedInstance;
}

function matchingDependencySelection(input: {
  readonly consumerSelection: ProviderSelection;
  readonly requirement: ResourceRequirement;
  readonly providerSelections: readonly ProviderSelection[];
}): ProviderSelection | undefined {
  const expectedRole = input.requirement.role ?? input.consumerSelection.role;

  return input.providerSelections.find(
    (candidate) =>
      candidate.resource.id === input.requirement.resource.id &&
      roleMatches(candidate.role, expectedRole) &&
      lifetimeMatches(candidate.lifetime, input.requirement.lifetime) &&
      instanceMatches(candidate.instance, input.requirement.instance),
  );
}

function dependencySelectionsFor(input: {
  readonly consumerSelection: ProviderSelection;
  readonly providerSelections: readonly ProviderSelection[];
}): readonly ProviderSelection[] {
  return input.consumerSelection.provider.requires.flatMap((requirement) => {
    const matchedSelection = matchingDependencySelection({
      consumerSelection: input.consumerSelection,
      requirement,
      providerSelections: input.providerSelections,
    });

    return matchedSelection ? [matchedSelection] : [];
  });
}

function assertProviderDependencyGraphReady(graph: ProviderDependencyGraph | undefined): void {
  const diagnostics = graph?.diagnostics ?? [];
  if (diagnostics.length === 0) return;

  throw new Error(
    `provider dependency graph has diagnostics: ${diagnostics
      .map((diagnostic) => diagnostic.code)
      .join(", ")}`,
  );
}

function dependencyEdgesBySourceModule(
  graph: ProviderDependencyGraph | undefined,
): ReadonlyMap<string, readonly ProviderDependencyGraphEdge[]> {
  const bySource = new Map<string, ProviderDependencyGraphEdge[]>();

  for (const edge of graph?.edges ?? []) {
    const sourceModuleId = providerBootResourceModuleId(
      providerDependencyNodeKey(edge.fromProviderKey),
    );
    const edges = bySource.get(sourceModuleId) ?? [];
    edges.push(edge);
    bySource.set(sourceModuleId, edges);
  }

  return bySource;
}

function resourceMapForDependencies(
  dependencyValues: ReadonlyMap<string, unknown>,
): RuntimeResourceMap {
  const resources = new Map<string, unknown>();

  for (const [dependencyId, dependencyValue] of dependencyValues) {
    const provisioned = dependencyValue as ProviderProvisionedValue | undefined;
    if (!provisioned || provisioned.kind !== "provider.provisioned-value") {
      continue;
    }

    resources.set(provisioned.key.resourceId, provisioned.value);
    resources.set(providerBootResourceModuleId(provisioned.key), provisioned.value);
  }

  return resources;
}

function pushEvent(
  trace: ProviderProvisioningTrace | undefined,
  name: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  trace?.events.push({ name, attributes });
}

function pushDiagnostic(
  trace: ProviderProvisioningTrace | undefined,
  message: string,
): void {
  trace?.diagnostics.push({ message });
}

function providerFailureMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function assertRuntimeProvider(
  provider: ProviderSelection["provider"],
): RuntimeProvider {
  return provider as RuntimeProvider;
}

/**
 * Lowers provider acquire/release into contained bootgraph modules. This earns
 * simulation proof for provisioning order and finalization, not production
 * harness readiness or final provider API shape.
 */
export function createProviderProvisioningModules(
  input: ProviderProvisioningModulesInput,
): readonly MiniBootgraphModule<ProviderProvisionedValue>[] {
  assertProviderDependencyGraphReady(input.providerDependencyGraph);

  const effectRuntime = input.effectRuntime ?? defaultEffectRuntime;
  const nodes = input.providerDependencyGraph?.nodes ?? [];
  const nodeByModuleId = new Map(
    nodes.map((node) => [
      providerBootResourceModuleId(providerDependencyNodeKey(node)),
      node,
    ]),
  );
  const dependencyEdges = dependencyEdgesBySourceModule(input.providerDependencyGraph);

  return input.providerSelections.map((selection) => {
    const key = selectedProviderKey(selection);
    const moduleId = providerBootResourceModuleId(key);
    const dependencies = input.providerDependencyGraph
      ? (dependencyEdges.get(moduleId) ?? []).flatMap((edge) =>
          edge.matchedProviderKey
            ? [
                providerBootResourceModuleId(
                  providerDependencyNodeKey(edge.matchedProviderKey),
                ),
              ]
            : [],
        )
      : dependencySelectionsFor({
          consumerSelection: selection,
          providerSelections: input.providerSelections,
        }).map((dependencySelection) =>
          providerBootResourceModuleId(selectedProviderKey(dependencySelection)),
        );
    const config = configFor(input.configs, key);

    return {
      kind: "mini-runtime.boot-module",
      id: moduleId,
      dependencies,
      metadata: {
        profileId: input.profileId,
        resourceId: key.resourceId,
        providerId: key.providerId,
        lifetime: key.lifetime,
        role: key.role,
        instance: key.instance,
        config,
        providerGraphNode: nodeByModuleId.get(moduleId),
      },
      async start(context) {
        pushEvent(input.trace, "provider.acquire.start", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
        const provider = assertRuntimeProvider(selection.provider);
        const plan = provider.build({
          config,
          resources: resourceMapForDependencies(context.dependencyValues),
          scope: {
            processId: input.processId,
            role: key.role,
          },
          telemetry: {
            event(name, attributes) {
              pushEvent(input.trace, name, attributes);
            },
          },
          diagnostics: {
            report(message) {
              pushDiagnostic(input.trace, message);
            },
          },
        });
        const internals = readProviderEffectPlanInternals(plan);
        if (!internals) {
          throw new Error(
            `provider ${key.providerId} returned an unlowerable ProviderEffectPlan`,
          );
        }

        const exit = await effectRuntime.runPromiseExit(internals.acquire());
        if (Exit.isFailure(exit)) {
          pushEvent(input.trace, "provider.acquire.failure", {
            providerId: key.providerId,
            resourceId: key.resourceId,
          });
          throw new Error(
            `provider ${key.providerId} acquire failed: ${providerFailureMessage(exit.cause)}`,
          );
        }

        pushEvent(input.trace, "provider.acquire.success", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
        return {
          kind: "provider.provisioned-value",
          key,
          value: exit.value,
          release: internals.release,
          events: [...(input.trace?.events ?? [])],
          diagnostics: [...(input.trace?.diagnostics ?? [])],
        };
      },
      async finalize(started) {
        if (!started.release) return;

        pushEvent(input.trace, "provider.release.start", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
        const exit = await effectRuntime.runPromiseExit(started.release(started.value));
        if (Exit.isFailure(exit)) {
          pushEvent(input.trace, "provider.release.failure", {
            providerId: key.providerId,
            resourceId: key.resourceId,
          });
          throw new Error(
            `provider ${key.providerId} release failed: ${providerFailureMessage(exit.cause)}`,
          );
        }
        pushEvent(input.trace, "provider.release.success", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
      },
    };
  });
}
