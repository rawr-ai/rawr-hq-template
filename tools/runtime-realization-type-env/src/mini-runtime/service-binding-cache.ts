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

export function createMiniServiceBindingCache<TClient>(input: {
  readonly processId?: string;
  readonly plans: readonly ServiceBindingPlan[];
  createClient(factoryInput: MiniServiceBindingFactoryInput): TClient;
}): MiniServiceBindingCache<TClient> {
  const byKey = new Map<string, MiniServiceBindingCacheEntry<TClient>>();
  const allowedPlans = new Map<string, ServiceBindingPlan>();

  for (const plan of input.plans) {
    const key = serviceBindingKey(plan);
    if (allowedPlans.has(key)) {
      throw new Error(`duplicate service binding plan: ${key}`);
    }
    allowedPlans.set(key, plan);
  }

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

      const existing = byKey.get(key);
      if (existing) return existing.client;

      const entry = createEntry(allowedPlan);
      byKey.set(key, entry);
      return entry.client;
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
