import type { ServiceBindingPlan } from "../spine/artifacts";

export interface MiniServiceBindingFactoryInput {
  readonly plan: ServiceBindingPlan;
  readonly constructionIdentity: string;
}

export interface MiniServiceBindingCacheRecord {
  readonly kind: "service.binding-cache-record";
  readonly serviceId: string;
  readonly role: string;
  readonly constructionIdentity: string;
}

export interface MiniServiceBindingCache<TClient = unknown> {
  readonly kind: "service.binding-cache";
  getOrCreate(plan: ServiceBindingPlan): TClient;
  records(): readonly MiniServiceBindingCacheRecord[];
}

interface MiniServiceBindingCacheEntry<TClient> {
  readonly plan: ServiceBindingPlan;
  readonly constructionIdentity: string;
  readonly client: TClient;
}

type ServiceBindingVisitState = "visiting" | "visited";

// Stable structural encoding keeps cache identity tied to declared fields, not
// lossy string joins that could collapse distinct service binding plans.
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

function serviceBindingKey(plan: ServiceBindingPlan): string {
  return stableJson({
    capability: plan.capability,
    configHash: plan.configHash,
    dependencyInstances: plan.dependencyInstances,
    role: plan.role,
    scopeHash: plan.scopeHash,
    serviceId: plan.serviceId,
    serviceInstance: plan.serviceInstance ?? "default",
    surface: plan.surface,
  });
}

function serviceBindingInstanceId(plan: ServiceBindingPlan): string {
  return plan.serviceInstance ?? plan.serviceId;
}

/**
 * Process-scoped construction identity for a service binding client.
 *
 * Invocation state is intentionally absent: this is the lab boundary between
 * process-lifetime service construction and per-request/per-step invocation
 * context. It is an evidence-friendly identity snapshot, not a production cache
 * key format or final service ownership contract.
 */
export function serviceBindingConstructionIdentity(
  plan: ServiceBindingPlan,
  processId = "process",
): string {
  return stableJson({
    capability: plan.capability,
    configHash: plan.configHash,
    dependencyInstances: plan.dependencyInstances,
    kind: "service.binding-construction",
    processId,
    role: plan.role,
    scopeHash: plan.scopeHash,
    serviceId: plan.serviceId,
    serviceInstance: plan.serviceInstance ?? "default",
    surface: plan.surface,
  });
}

function indexServiceBindingInstances(
  plans: readonly ServiceBindingPlan[],
): ReadonlyMap<string, readonly ServiceBindingPlan[]> {
  const byInstance = new Map<string, ServiceBindingPlan[]>();

  for (const plan of plans) {
    const instanceId = serviceBindingInstanceId(plan);
    byInstance.set(instanceId, [...(byInstance.get(instanceId) ?? []), plan]);
  }

  return byInstance;
}

function resolveServiceBindingDependency(input: {
  readonly plan: ServiceBindingPlan;
  readonly dependencyInstance: string;
  readonly byInstance: ReadonlyMap<string, readonly ServiceBindingPlan[]>;
}): ServiceBindingPlan {
  const matches = input.byInstance.get(input.dependencyInstance) ?? [];
  const planId = serviceBindingInstanceId(input.plan);

  if (matches.length === 0) {
    throw new Error(
      `runtime.service-binding.dependency.missing: ${planId} -> ${input.dependencyInstance}`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `runtime.service-binding.dependency.ambiguous: ${planId} -> ${input.dependencyInstance}`,
    );
  }

  return matches[0] as ServiceBindingPlan;
}

function validateServiceBindingDependencyGraph(input: {
  readonly plans: readonly ServiceBindingPlan[];
  readonly byInstance: ReadonlyMap<string, readonly ServiceBindingPlan[]>;
}): void {
  const state = new Map<string, ServiceBindingVisitState>();

  // This validates explicit lab ServiceBindingPlan dependency inputs only. It
  // is not the production service compiler or the final service ownership law.
  function visit(
    plan: ServiceBindingPlan,
    path: readonly ServiceBindingPlan[],
  ): void {
    const key = serviceBindingKey(plan);
    const visitState = state.get(key);

    if (visitState === "visited") return;

    if (visitState === "visiting") {
      const cycleStart = path.findIndex(
        (pathPlan) => serviceBindingKey(pathPlan) === key,
      );
      const cycle = [
        ...(cycleStart >= 0 ? path.slice(cycleStart) : path),
        plan,
      ].map(serviceBindingInstanceId);

      throw new Error(
        `runtime.service-binding.dependency.cycle: ${cycle.join(" -> ")}`,
      );
    }

    state.set(key, "visiting");

    for (const dependencyInstance of plan.dependencyInstances) {
      visit(
        resolveServiceBindingDependency({
          plan,
          dependencyInstance,
          byInstance: input.byInstance,
        }),
        [...path, plan],
      );
    }

    state.set(key, "visited");
  }

  for (const plan of input.plans) {
    visit(plan, []);
  }
}

/**
 * Creates the contained service binding cache used by the mini runtime.
 *
 * The cache accepts only predeclared ServiceBindingPlan values, validates their
 * dependency graph before construction, and materializes dependencies before
 * dependents. That records lifecycle ordering inside this lab without choosing
 * the production service compiler, container, or cross-process cache semantics.
 */
export function createMiniServiceBindingCache<TClient>(input: {
  readonly processId?: string;
  readonly plans: readonly ServiceBindingPlan[];
  createClient(factoryInput: MiniServiceBindingFactoryInput): TClient;
}): MiniServiceBindingCache<TClient> {
  const byKey = new Map<string, MiniServiceBindingCacheEntry<TClient>>();
  const allowedPlans = new Map<string, ServiceBindingPlan>();
  const byInstance = indexServiceBindingInstances(input.plans);

  for (const plan of input.plans) {
    const key = serviceBindingKey(plan);
    if (allowedPlans.has(key)) {
      throw new Error(`duplicate service binding plan: ${key}`);
    }
    allowedPlans.set(key, plan);
  }

  validateServiceBindingDependencyGraph({
    plans: input.plans,
    byInstance,
  });

  function createEntry(plan: ServiceBindingPlan): MiniServiceBindingCacheEntry<TClient> {
    const constructionIdentity = serviceBindingConstructionIdentity(
      plan,
      input.processId,
    );
    return {
      plan,
      constructionIdentity,
      client: input.createClient({ plan, constructionIdentity }),
    };
  }

  // The mini cache is the contained simulation-proof point for binding lifecycle
  // order: a dependent is materialized only after its declared service-instance
  // prerequisites have construction identities in this process.
  function getOrCreateAllowedPlan(plan: ServiceBindingPlan): TClient {
    const key = serviceBindingKey(plan);
    const existing = byKey.get(key);
    if (existing) return existing.client;

    for (const dependencyInstance of plan.dependencyInstances) {
      getOrCreateAllowedPlan(
        resolveServiceBindingDependency({
          plan,
          dependencyInstance,
          byInstance,
        }),
      );
    }

    const entry = createEntry(plan);
    byKey.set(key, entry);
    return entry.client;
  }

  return {
    kind: "service.binding-cache",
    getOrCreate(plan) {
      const key = serviceBindingKey(plan);
      const allowedPlan = allowedPlans.get(key);
      if (!allowedPlan) {
        throw new Error(
          `missing service binding plan: ${key}`,
        );
      }

      return getOrCreateAllowedPlan(allowedPlan);
    },
    records() {
      return [...byKey.values()].map((entry) => ({
        kind: "service.binding-cache-record" as const,
        serviceId: entry.plan.serviceId,
        role: entry.plan.role,
        constructionIdentity: entry.constructionIdentity,
      }));
    },
  };
}
