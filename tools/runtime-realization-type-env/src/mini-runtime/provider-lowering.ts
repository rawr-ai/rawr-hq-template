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
import {
  redactRuntimeRecordAttributes,
  redactRuntimeRecordValue,
  type RuntimeRecordAttributes,
  type RuntimeRecordValue,
} from "./catalog";
import {
  createRuntimeBoundaryPolicyRecord,
  runtimeBoundaryPolicyRecordAttributes,
  type RuntimeBoundaryPolicy,
  type RuntimeBoundaryPolicyRecord,
} from "./boundary-policy";

export interface ProviderBootResourceKey {
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface ProviderProvisioningEvent {
  readonly name: string;
  readonly attributes?: RuntimeRecordAttributes;
}

export interface ProviderProvisioningDiagnostic {
  readonly message: string;
  readonly attributes?: RuntimeRecordAttributes;
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

interface ProviderConfigSelection {
  readonly value: unknown;
  readonly source: "module" | "provider" | "default";
  readonly sourceKey?: string;
}

type ProviderConfigValidation =
  | {
      readonly status: "valid";
      readonly config: unknown;
      readonly snapshot: RuntimeRecordValue;
      readonly schemaId?: string;
    }
  | {
      readonly status: "invalid";
      readonly snapshot: RuntimeRecordValue;
      readonly schemaId?: string;
      readonly message: string;
      readonly attributes: Record<string, unknown>;
    };

export interface ProviderProvisioningModulesInput {
  readonly profileId: string;
  readonly providerSelections: readonly ProviderSelection[];
  readonly providerDependencyGraph?: ProviderDependencyGraph;
  readonly configs?: ProviderConfigMap;
  readonly processId: string;
  readonly effectRuntime?: EffectRuntimeAccess;
  readonly trace?: ProviderProvisioningTrace;
  /**
   * Record-only policy hook scoped to provider acquire/release effects. It marks
   * the boundary in the proof trace without changing provider scheduling,
   * retry, timeout, or release-handle ownership.
   */
  readonly boundaryPolicy?: (input: {
    readonly phase: "acquire" | "release";
    readonly key: ProviderBootResourceKey;
  }) => RuntimeBoundaryPolicy | undefined;
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

/**
 * Chooses between module-scoped and provider-id fixture config for this lab
 * proof only. It is not production config source precedence.
 */
function configFor(
  configs: ProviderConfigMap | undefined,
  key: ProviderBootResourceKey,
): ProviderConfigSelection {
  if (!configs) {
    return { value: {}, source: "default" };
  }

  const moduleId = providerBootResourceModuleId(key);
  if (isReadonlyMap(configs)) {
    if (configs.has(moduleId)) {
      return { value: configs.get(moduleId), source: "module", sourceKey: moduleId };
    }
    if (configs.has(key.providerId)) {
      return {
        value: configs.get(key.providerId),
        source: "provider",
        sourceKey: key.providerId,
      };
    }
    return { value: {}, source: "default" };
  }

  const configRecord = configs as { readonly [key: string]: unknown };
  if (Object.prototype.hasOwnProperty.call(configRecord, moduleId)) {
    return { value: configRecord[moduleId], source: "module", sourceKey: moduleId };
  }
  if (Object.prototype.hasOwnProperty.call(configRecord, key.providerId)) {
    return {
      value: configRecord[key.providerId],
      source: "provider",
      sourceKey: key.providerId,
    };
  }
  return { value: {}, source: "default" };
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
  attributes?: Record<string, unknown>,
): void {
  trace?.events.push(
    attributes
      ? { name, attributes: redactRuntimeRecordAttributes(attributes) }
      : { name },
  );
}

/**
 * Redacts structured trace diagnostic attributes only. Provider-authored
 * diagnostic messages remain free-form strings and are not proof of arbitrary
 * message redaction.
 */
function pushDiagnostic(
  trace: ProviderProvisioningTrace | undefined,
  message: string,
  attributes?: Record<string, unknown>,
): void {
  trace?.diagnostics.push(
    attributes
      ? { message, attributes: redactRuntimeRecordAttributes(attributes) }
      : { message },
  );
}

function boundaryPolicyRecordAttributes(
  record: RuntimeBoundaryPolicyRecord,
): RuntimeRecordAttributes {
  return runtimeBoundaryPolicyRecordAttributes(record);
}

/**
 * Emits provider acquire/release policy records through the same redacted event
 * shape as process execution. Record scope is provider identity plus resource
 * identity; provisioned values and release callbacks stay out of trace data.
 */
function pushBoundaryPolicyRecord(
  trace: ProviderProvisioningTrace | undefined,
  input: {
    readonly policy: RuntimeBoundaryPolicy | undefined;
    readonly phase: RuntimeBoundaryPolicyRecord["phase"];
    readonly exit?: Exit.Exit<unknown, unknown>;
    readonly attributes?: Record<string, unknown>;
  },
): void {
  if (!input.policy) return;

  const record = createRuntimeBoundaryPolicyRecord({
    policy: input.policy,
    phase: input.phase,
    exit: input.exit,
    attributes: input.attributes,
  });
  pushEvent(trace, record.phase, boundaryPolicyRecordAttributes(record));
}

/**
 * Keeps provider failure records diagnostic-safe in the lab. Final Exit/Cause
 * mapping and public error payload policy belong to the boundary matrix.
 */
function providerFailureMessage(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  if (error && typeof error === "object" && "_tag" in error) {
    return String((error as { readonly _tag: unknown })._tag);
  }
  return "provider failure";
}

function assertRuntimeProvider(
  provider: ProviderSelection["provider"],
): RuntimeProvider {
  return provider as RuntimeProvider;
}

/**
 * Validates lab-supplied provider config for the contained provisioning proof.
 * It is not final config source precedence, production secret binding, or
 * public diagnostics policy.
 */
function validateProviderConfig(input: {
  readonly provider: RuntimeProvider;
  readonly key: ProviderBootResourceKey;
  readonly selection: ProviderConfigSelection;
}): ProviderConfigValidation {
  const schema = input.provider.configSchema;
  const snapshot = redactRuntimeRecordValue(input.selection.value);

  if (!schema) {
    return {
      status: "valid",
      config: input.selection.value,
      snapshot,
    };
  }

  try {
    return {
      status: "valid",
      config: schema.parse(input.selection.value),
      snapshot,
      schemaId: schema.id,
    };
  } catch {
    return {
      status: "invalid",
      snapshot,
      schemaId: schema.id,
      message: `provider.config.invalid: provider ${input.key.providerId} config invalid for schema ${schema.id}`,
      attributes: {
        code: "provider.config.invalid",
        providerId: input.key.providerId,
        resourceId: input.key.resourceId,
        schemaId: schema.id,
        configSource: input.selection.source,
        configSourceKey: input.selection.sourceKey,
        config: snapshot,
      },
    };
  }
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
    const provider = assertRuntimeProvider(selection.provider);
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
    const configSelection = configFor(input.configs, key);

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
        configSchemaId: provider.configSchema?.id,
        configSource: configSelection.source,
        configSourceKey: configSelection.sourceKey,
        configSnapshot: redactRuntimeRecordValue(configSelection.value),
        providerGraphNode: nodeByModuleId.get(moduleId),
      },
      async start(context) {
        pushEvent(input.trace, "provider.acquire.start", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
        const configValidation = validateProviderConfig({
          provider,
          key,
          selection: configSelection,
        });
        if (configValidation.status === "invalid") {
          pushEvent(input.trace, "provider.config.invalid", configValidation.attributes);
          pushDiagnostic(
            input.trace,
            "provider config validation failed",
            configValidation.attributes,
          );
          throw new Error(configValidation.message);
        }

        pushEvent(input.trace, "provider.config.validated", {
          providerId: key.providerId,
          resourceId: key.resourceId,
          schemaId: configValidation.schemaId,
          configSource: configSelection.source,
          configSourceKey: configSelection.sourceKey,
          config: configValidation.snapshot,
        });

        const plan = provider.build({
          config: configValidation.config,
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

        const acquirePolicy = input.boundaryPolicy?.({ phase: "acquire", key });
        pushBoundaryPolicyRecord(input.trace, {
          policy: acquirePolicy,
          phase: "boundary.policy.enter",
          attributes: {
            providerId: key.providerId,
            resourceId: key.resourceId,
          },
        });
        const exit = await effectRuntime.runPromiseExit(internals.acquire());
        pushBoundaryPolicyRecord(input.trace, {
          policy: acquirePolicy,
          phase: "boundary.policy.exit",
          exit,
          attributes: {
            providerId: key.providerId,
            resourceId: key.resourceId,
          },
        });
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

        // Release policy is sampled separately so acquire and release remain
        // distinct matrix cells instead of a single generic provider boundary.
        const releasePolicy = input.boundaryPolicy?.({ phase: "release", key });
        pushEvent(input.trace, "provider.release.start", {
          providerId: key.providerId,
          resourceId: key.resourceId,
        });
        pushBoundaryPolicyRecord(input.trace, {
          policy: releasePolicy,
          phase: "boundary.policy.enter",
          attributes: {
            providerId: key.providerId,
            resourceId: key.resourceId,
          },
        });
        const exit = await effectRuntime.runPromiseExit(started.release(started.value));
        pushBoundaryPolicyRecord(input.trace, {
          policy: releasePolicy,
          phase: "boundary.policy.exit",
          exit,
          attributes: {
            providerId: key.providerId,
            resourceId: key.resourceId,
          },
        });
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
