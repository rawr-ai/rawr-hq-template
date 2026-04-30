import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import {
  startRuntimeBootgraph,
  type RuntimeBootModule,
} from "@rawr/core-runtime-bootgraph";
import {
  createManagedEffectRuntimeAccess,
  effectBodyToRawrEffect,
  type EffectRuntimeAccess,
} from "@rawr/core-runtime-substrate";
import {
  createRuntimeDiagnostic,
  stableRuntimeJson,
  type RuntimeDiagnostic,
  type RuntimeTopologyRecord,
} from "@rawr/core-runtime-topology";
import type { ProviderSelection, RuntimeProfile } from "@rawr/sdk/runtime/profiles";
import type {
  ProviderBuildContext,
  RuntimeProvider,
  RuntimeResourceMap,
} from "@rawr/sdk/runtime/providers";
import {
  PROVIDER_EFFECT_PLAN,
  type ProviderEffectPlanInternals,
} from "@rawr/sdk/runtime/providers/effect";
import type {
  AppRole,
  ResourceLifetime,
  ResourceRequirement,
} from "@rawr/sdk/runtime/resources";

export const RAWR_RUNTIME_STANDARD_TOPOLOGY = "packages/core/runtime/standard" as const;

export type RuntimeRecordScalar = string | number | boolean | null;

export type RuntimeRecordValue =
  | RuntimeRecordScalar
  | readonly RuntimeRecordValue[]
  | { readonly [key: string]: RuntimeRecordValue };

export type RuntimeRecordAttributes = {
  readonly [key: string]: RuntimeRecordValue;
};

export interface RuntimeCatalogRecord {
  readonly kind: "runtime.catalog-record";
  readonly sequence: number;
  readonly phase: string;
  readonly subjectId: string;
  readonly attributes: RuntimeRecordAttributes;
}

export interface RuntimeCatalogModuleRecord {
  readonly kind: "runtime.catalog.module";
  readonly moduleId: string;
  readonly dependencies: readonly string[];
  readonly metadata: RuntimeRecordAttributes;
}

export interface RuntimeCatalogSnapshot {
  readonly kind: "runtime.catalog.snapshot";
  readonly runId: string;
  readonly modules: readonly RuntimeCatalogModuleRecord[];
  readonly records: readonly RuntimeCatalogRecord[];
}

export interface RuntimeCatalogRecorder {
  module(input: {
    readonly moduleId: string;
    readonly dependencies?: readonly string[];
    readonly metadata?: Record<string, unknown>;
  }): RuntimeCatalogModuleRecord;
  record(input: {
    readonly phase: string;
    readonly subjectId: string;
    readonly attributes?: Record<string, unknown>;
  }): RuntimeCatalogRecord;
  snapshot(): RuntimeCatalogSnapshot;
}

export interface RuntimeSecretRef {
  readonly kind: "runtime.secret-ref";
  readonly id: string;
}

export interface RuntimeSecretStore {
  get(id: string): unknown | Promise<unknown>;
}

export type RuntimeConfigRecord = { readonly [key: string]: unknown };

export interface RuntimeConfigStore {
  get(key: string): unknown;
  entries(): readonly (readonly [string, unknown])[];
  redactedSnapshot(): RuntimeRecordAttributes;
}

export interface RuntimeConfigLoadOptions {
  readonly env?: Record<string, string | undefined>;
  readonly readFile?: (path: string) => Promise<string> | string;
}

export interface ProviderBootResourceKey {
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}

export interface ProviderDependencyGraphNode {
  readonly key: ProviderBootResourceKey;
  readonly moduleId: string;
}

export interface ProviderDependencyGraphEdge {
  readonly fromModuleId: string;
  readonly toModuleId?: string;
  readonly requirement: ResourceRequirement;
}

export interface ProviderDependencyGraph {
  readonly kind: "runtime.provider-dependency-graph";
  readonly nodes: readonly ProviderDependencyGraphNode[];
  readonly edges: readonly ProviderDependencyGraphEdge[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
}

export interface ProviderProvisionedValue<TValue = unknown> {
  readonly kind: "provider.provisioned-value";
  readonly key: ProviderBootResourceKey;
  readonly value: TValue;
}

export interface ProviderProvisioningInput {
  readonly profileId: string;
  readonly providerSelections: readonly ProviderSelection[];
  readonly processId: string;
  readonly configStore?: RuntimeConfigStore;
  readonly secretStore?: RuntimeSecretStore;
  readonly effectRuntime?: EffectRuntimeAccess;
  readonly catalog?: RuntimeCatalogRecorder;
  readonly providerDependencyGraph?: ProviderDependencyGraph;
}

const SENSITIVE_RECORD_KEY =
  /secret|token|password|credential|api[-_]?key|private[-_]?key|handle/i;

export function redactRuntimeValue(
  value: unknown,
  key?: string,
  seen: WeakSet<object> = new WeakSet(),
): RuntimeRecordValue {
  if (key && SENSITIVE_RECORD_KEY.test(key)) return "[redacted]";

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") return value.toString();

  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return "[redacted:live-handle]";
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactRuntimeValue(entry, undefined, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[redacted:cycle]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactRuntimeValue(entryValue, entryKey, seen),
      ]),
    ) as RuntimeRecordAttributes;
  }

  return String(value);
}

export function redactRuntimeAttributes(
  attributes: Record<string, unknown> = {},
): RuntimeRecordAttributes {
  return redactRuntimeValue(attributes) as RuntimeRecordAttributes;
}

export function createRuntimeCatalogRecorder(input: {
  readonly runId: string;
  readonly modules?: readonly {
    readonly moduleId: string;
    readonly dependencies?: readonly string[];
    readonly metadata?: Record<string, unknown>;
  }[];
}): RuntimeCatalogRecorder {
  const modules: RuntimeCatalogModuleRecord[] = [];
  const records: RuntimeCatalogRecord[] = [];
  const recorder: RuntimeCatalogRecorder = {
    module(moduleInput) {
      const moduleRecord = {
        kind: "runtime.catalog.module" as const,
        moduleId: moduleInput.moduleId,
        dependencies: [...(moduleInput.dependencies ?? [])],
        metadata: redactRuntimeAttributes(moduleInput.metadata),
      };
      modules.push(moduleRecord);
      return moduleRecord;
    },
    record(recordInput) {
      const record = {
        kind: "runtime.catalog-record" as const,
        sequence: records.length + 1,
        phase: recordInput.phase,
        subjectId: recordInput.subjectId,
        attributes: redactRuntimeAttributes(recordInput.attributes),
      };
      records.push(record);
      return record;
    },
    snapshot() {
      return {
        kind: "runtime.catalog.snapshot",
        runId: input.runId,
        modules: modules.map((module) => ({
          ...module,
          dependencies: [...module.dependencies],
          metadata: { ...module.metadata },
        })),
        records: records.map((record) => ({
          ...record,
          attributes: { ...record.attributes },
        })),
      };
    },
  };

  for (const moduleInput of input.modules ?? []) recorder.module(moduleInput);
  return recorder;
}

export async function persistRuntimeCatalogSnapshot(input: {
  readonly snapshot: RuntimeCatalogSnapshot;
  readonly rootDir?: string;
  readonly fileName?: string;
}): Promise<string> {
  const rootDir = input.rootDir ?? ".rawr/runtime/catalog";
  const fileName =
    input.fileName ?? `${input.snapshot.runId.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
  if (isAbsolute(fileName) || fileName !== basename(fileName)) {
    throw new Error(`runtime catalog fileName must be a file name: ${fileName}`);
  }

  const rootPath = resolve(rootDir);
  const path = resolve(join(rootPath, fileName));
  const relativePath = relative(rootPath, path);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`runtime catalog path escapes root: ${fileName}`);
  }

  await mkdir(rootPath, { recursive: true });
  await writeFile(path, `${JSON.stringify(input.snapshot, null, 2)}\n`, "utf8");
  return path;
}

export function secretRef(id: string): RuntimeSecretRef {
  return { kind: "runtime.secret-ref", id };
}

function isSecretRef(value: unknown): value is RuntimeSecretRef {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as RuntimeSecretRef).kind === "runtime.secret-ref" &&
    typeof (value as RuntimeSecretRef).id === "string"
  );
}

interface ResolvedRuntimeConfig {
  readonly value: unknown;
  readonly snapshot: RuntimeRecordValue;
}

async function resolveConfigValue(
  value: unknown,
  secretStore: RuntimeSecretStore | undefined,
  key?: string,
): Promise<ResolvedRuntimeConfig> {
  if (isSecretRef(value)) {
    if (!secretStore) {
      throw new Error(`missing runtime secret store for ${value.id}`);
    }
    return {
      value: await secretStore.get(value.id),
      snapshot: "[redacted]",
    };
  }

  if (Array.isArray(value)) {
    const entries = await Promise.all(
      value.map((entry) => resolveConfigValue(entry, secretStore)),
    );
    return {
      value: entries.map((entry) => entry.value),
      snapshot: entries.map((entry) => entry.snapshot),
    };
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([entryKey, entryValue]) => [
        entryKey,
        await resolveConfigValue(entryValue, secretStore, entryKey),
      ] as const),
    );
    return {
      value: Object.fromEntries(
        entries.map(([entryKey, entryValue]) => [entryKey, entryValue.value]),
      ),
      snapshot: Object.fromEntries(
        entries.map(([entryKey, entryValue]) => [entryKey, entryValue.snapshot]),
      ) as RuntimeRecordAttributes,
    };
  }

  return {
    value,
    snapshot: redactRuntimeValue(value, key),
  };
}

function resolveConfigSnapshot(input: {
  readonly parsedConfig: unknown;
  readonly rawSnapshot: RuntimeRecordValue;
  readonly schemaRedacted?: boolean;
}): RuntimeRecordValue {
  if (input.schemaRedacted) return "[redacted]";

  if (typeof input.rawSnapshot === "string" && input.rawSnapshot === "[redacted]") {
    return input.rawSnapshot;
  }

  if (
    input.rawSnapshot &&
    typeof input.rawSnapshot === "object" &&
    !Array.isArray(input.rawSnapshot)
  ) {
    const rawRecord = input.rawSnapshot as RuntimeRecordAttributes;
    const parsedRecord =
      input.parsedConfig && typeof input.parsedConfig === "object"
        ? (input.parsedConfig as Record<string, unknown>)
        : {};
    return Object.fromEntries(
      Object.entries(rawRecord).map(([entryKey, entrySnapshot]) => [
        entryKey,
        entrySnapshot === "[redacted]"
          ? "[redacted]"
          : redactRuntimeValue(parsedRecord[entryKey], entryKey),
      ]),
    ) as RuntimeRecordAttributes;
  }

  if (Array.isArray(input.rawSnapshot)) {
    return input.rawSnapshot;
  }

  return redactRuntimeValue(input.parsedConfig);
}

function hasRedactedValue(value: RuntimeRecordValue): boolean {
  if (value === "[redacted]") return true;
  if (Array.isArray(value)) return value.some(hasRedactedValue);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasRedactedValue);
  }
  return false;
}

function stripRedactedConfigKeys(
  value: RuntimeRecordValue,
): RuntimeRecordValue {
  if (Array.isArray(value)) return value.map(stripRedactedConfigKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => {
        if (entryValue === "[redacted]") return false;
        return true;
      }).map(([entryKey, entryValue]) => [
        entryKey,
        stripRedactedConfigKeys(entryValue),
      ]),
    ) as RuntimeRecordAttributes;
  }
  return value;
}

function safeConfigCatalogSnapshot(value: RuntimeRecordValue): RuntimeRecordValue {
  if (hasRedactedValue(value)) return stripRedactedConfigKeys(value);
  return value;
}

export function createInMemorySecretStore(
  secrets: ReadonlyMap<string, unknown> | Record<string, unknown>,
): RuntimeSecretStore {
  return {
    get(id) {
      if (typeof (secrets as ReadonlyMap<string, unknown>).get === "function") {
        const secretMap = secrets as ReadonlyMap<string, unknown>;
        if (!secretMap.has(id)) throw new Error(`missing runtime secret: ${id}`);
        return secretMap.get(id);
      }
      const secretRecord = secrets as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(secretRecord, id)) {
        throw new Error(`missing runtime secret: ${id}`);
      }
      return secretRecord[id];
    },
  };
}

export function createRuntimeConfigStore(
  record: RuntimeConfigRecord = {},
): RuntimeConfigStore {
  const values = new Map(Object.entries(record));
  return {
    get(key) {
      return values.get(key);
    },
    entries() {
      return [...values.entries()];
    },
    redactedSnapshot() {
      return redactRuntimeAttributes(Object.fromEntries(values.entries()));
    },
  };
}

function assertConfigRecord(value: unknown, source: string): RuntimeConfigRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`runtime config source ${source} must decode to an object`);
  }
  return value as RuntimeConfigRecord;
}

export async function loadRuntimeConfigSources(
  sources: RuntimeProfile["configSources"] = [],
  options: RuntimeConfigLoadOptions = {},
): Promise<RuntimeConfigStore> {
  const merged: Record<string, unknown> = {};
  const env = options.env ?? process.env;
  const fileReader = options.readFile ?? readFile;

  for (const source of sources) {
    if (source.kind === "env") {
      const prefix = source.prefix ?? "";
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined || !key.startsWith(prefix)) continue;
        merged[prefix ? key.slice(prefix.length) : key] = value;
      }
      continue;
    }

    try {
      const fileContents = await fileReader(source.path);
      Object.assign(
        merged,
        assertConfigRecord(JSON.parse(String(fileContents)), source.path),
      );
    } catch (error) {
      if (source.optional) continue;
      throw error;
    }
  }

  return createRuntimeConfigStore(merged);
}

export function providerBootResourceKey(input: {
  readonly resourceId: string;
  readonly providerId: string;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly instance?: string;
}): ProviderBootResourceKey {
  return {
    resourceId: input.resourceId,
    providerId: input.providerId,
    lifetime: input.lifetime ?? "process",
    role: input.role,
    instance: input.instance,
  };
}

export function providerBootResourceModuleId(key: ProviderBootResourceKey): string {
  return `provider:${stableRuntimeJson({
    instance: key.instance ?? null,
    lifetime: key.lifetime,
    providerId: key.providerId,
    resourceId: key.resourceId,
    role: key.role ?? null,
  })}`;
}

function selectionKey(selection: ProviderSelection): ProviderBootResourceKey {
  return providerBootResourceKey({
    resourceId: selection.resource.id,
    providerId: selection.provider.id,
    lifetime: selection.lifetime ?? selection.resource.defaultLifetime,
    role: selection.role,
    instance: selection.instance,
  });
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

type DependencySelectionMatch =
  | {
      readonly status: "matched";
      readonly selection: ProviderSelection;
    }
  | {
      readonly status: "ambiguous";
      readonly candidates: readonly ProviderSelection[];
    }
  | {
      readonly status: "missing";
    };

function matchingDependencySelection(input: {
  readonly consumerSelection: ProviderSelection;
  readonly requirement: ResourceRequirement;
  readonly providerSelections: readonly ProviderSelection[];
}): DependencySelectionMatch {
  const expectedRole = input.requirement.role ?? input.consumerSelection.role;
  const candidates = input.providerSelections.filter((candidate) => {
    const candidateKey = selectionKey(candidate);
    return (
      candidate.resource.id === input.requirement.resource.id &&
      lifetimeMatches(candidateKey.lifetime, input.requirement.lifetime) &&
      instanceMatches(candidate.instance, input.requirement.instance)
    );
  });

  const exact = candidates.filter((candidate) => candidate.role === expectedRole);
  if (exact.length === 1) {
    return { status: "matched", selection: exact[0] };
  }
  if (exact.length > 1) {
    return { status: "ambiguous", candidates: exact };
  }

  if (expectedRole !== undefined) {
    const fallback = candidates.filter((candidate) => candidate.role === undefined);
    if (fallback.length === 1) {
      return { status: "matched", selection: fallback[0] };
    }
    if (fallback.length > 1) {
      return { status: "ambiguous", candidates: fallback };
    }
  }

  return { status: "missing" };
}

function providerDiagnostic(input: {
  readonly code: string;
  readonly message: string;
  readonly selection: ProviderSelection;
  readonly requirement?: ResourceRequirement;
}): RuntimeDiagnostic {
  return createRuntimeDiagnostic({
    code: input.code,
    message: input.message,
    attributes: {
      providerId: input.selection.provider.id,
      resourceId: input.selection.resource.id,
      requiredResourceId: input.requirement?.resource.id ?? "",
    },
  });
}

export function deriveProviderDependencyGraph(input: {
  readonly providerSelections: readonly ProviderSelection[];
}): ProviderDependencyGraph {
  const nodes: ProviderDependencyGraphNode[] = [];
  const edges: ProviderDependencyGraphEdge[] = [];
  const diagnostics: RuntimeDiagnostic[] = [];
  const nodeByModuleId = new Map<string, ProviderDependencyGraphNode>();

  for (const selection of input.providerSelections) {
    const key = selectionKey(selection);
    const moduleId = providerBootResourceModuleId(key);
    if (nodeByModuleId.has(moduleId)) {
      diagnostics.push(
        providerDiagnostic({
          code: "runtime.provider.duplicate-selection",
          message: `duplicate provider selection ${selection.provider.id}`,
          selection,
        }),
      );
      continue;
    }
    const node = { key, moduleId };
    nodes.push(node);
    nodeByModuleId.set(moduleId, node);
  }

  for (const selection of input.providerSelections) {
    const fromModuleId = providerBootResourceModuleId(selectionKey(selection));
    const provider = selection.provider as RuntimeProvider<any, unknown>;
    for (const requirement of provider.requires ?? []) {
      const match = matchingDependencySelection({
        consumerSelection: selection,
        requirement,
        providerSelections: input.providerSelections,
      });
      const toModuleId = match.status === "matched"
        ? providerBootResourceModuleId(selectionKey(match.selection))
        : undefined;
      edges.push({ fromModuleId, toModuleId, requirement });
      if (match.status === "ambiguous") {
        diagnostics.push(
          providerDiagnostic({
            code: "runtime.provider.ambiguous-dependency",
            message: `provider ${selection.provider.id} has ambiguous providers for ${requirement.resource.id}`,
            selection,
            requirement,
          }),
        );
      }
      if (match.status === "missing" && !requirement.optional) {
        diagnostics.push(
          providerDiagnostic({
            code: "runtime.provider.missing-dependency",
            message: `provider ${selection.provider.id} requires ${requirement.resource.id}`,
            selection,
            requirement,
          }),
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const edgeTargets = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.toModuleId) continue;
    edgeTargets.set(edge.fromModuleId, [
      ...(edgeTargets.get(edge.fromModuleId) ?? []),
      edge.toModuleId,
    ]);
  }

  function visit(moduleId: string): void {
    if (visited.has(moduleId)) return;
    if (visiting.has(moduleId)) {
      diagnostics.push(
        createRuntimeDiagnostic({
          code: "runtime.provider.dependency-cycle",
          message: `provider dependency cycle at ${moduleId}`,
          attributes: { moduleId },
        }),
      );
      return;
    }
    visiting.add(moduleId);
    for (const target of edgeTargets.get(moduleId) ?? []) visit(target);
    visiting.delete(moduleId);
    visited.add(moduleId);
  }

  for (const node of nodes) visit(node.moduleId);
  return {
    kind: "runtime.provider-dependency-graph",
    nodes,
    edges,
    diagnostics,
  };
}

function configKeysFor(input: {
  readonly selection: ProviderSelection;
  readonly key: ProviderBootResourceKey;
}): readonly string[] {
  return [
    input.selection.configKey,
    input.selection.provider.defaultConfigKey,
    providerBootResourceModuleId(input.key),
    input.selection.provider.id,
    input.selection.resource.id,
  ].filter((key): key is string => typeof key === "string" && key.length > 0);
}

async function providerConfigFor(input: {
  readonly selection: ProviderSelection;
  readonly key: ProviderBootResourceKey;
  readonly configStore: RuntimeConfigStore;
  readonly secretStore?: RuntimeSecretStore;
}): Promise<ResolvedRuntimeConfig> {
  for (const configKey of configKeysFor(input)) {
    const config = input.configStore.get(configKey);
    if (config !== undefined) {
      return resolveConfigValue(config, input.secretStore);
    }
  }
  return { value: {}, snapshot: {} };
}

function resourcesForDependencies(input: {
  readonly dependencies: readonly string[];
  readonly provisioned: ReadonlyMap<string, ProviderProvisionedValue>;
}): RuntimeResourceMap {
  const resources = new Map<string, unknown>();
  const resourceCounts = new Map<string, number>();

  for (const dependency of input.dependencies) {
    const provisioned = input.provisioned.get(dependency);
    if (!provisioned) continue;
    resourceCounts.set(
      provisioned.key.resourceId,
      (resourceCounts.get(provisioned.key.resourceId) ?? 0) + 1,
    );
  }

  for (const dependency of input.dependencies) {
    const provisioned = input.provisioned.get(dependency);
    if (!provisioned) continue;
    if (
      (resourceCounts.get(provisioned.key.resourceId) ?? 0) === 1 &&
      provisioned.key.instance === undefined
    ) {
      resources.set(provisioned.key.resourceId, provisioned.value);
    }
    resources.set(dependency, provisioned.value);
  }
  return resources;
}

function providerPlanInternals<TValue>(
  plan: unknown,
  providerId: string,
): ProviderEffectPlanInternals<TValue, unknown> {
  const internals =
    (plan as { readonly [PROVIDER_EFFECT_PLAN]?: ProviderEffectPlanInternals<TValue, unknown> })[
      PROVIDER_EFFECT_PLAN
    ];
  if (!internals) {
    throw new Error(`provider ${providerId} returned an unlowerable ProviderEffectPlan`);
  }
  return internals;
}

function assertProviderGraphReady(graph: ProviderDependencyGraph): void {
  if (graph.diagnostics.length === 0) return;
  throw new Error(
    `provider dependency graph has diagnostics: ${graph.diagnostics
      .map((diagnostic) => diagnostic.code)
      .join(", ")}`,
  );
}

export function createProviderProvisioningBootModules(
  input: ProviderProvisioningInput,
): readonly RuntimeBootModule[] {
  const graph =
    input.providerDependencyGraph ??
    deriveProviderDependencyGraph({ providerSelections: input.providerSelections });
  assertProviderGraphReady(graph);

  const ownsEffectRuntime = input.effectRuntime === undefined;
  const effectRuntimeModuleId = `runtime:effect-runtime:${input.processId}`;
  let effectRuntime = input.effectRuntime;
  const getEffectRuntime = () => {
    effectRuntime ??= createManagedEffectRuntimeAccess();
    return effectRuntime;
  };
  const configStore = input.configStore ?? createRuntimeConfigStore();
  const provisionedValues = new Map<string, ProviderProvisionedValue>();
  const dependencyByModuleId = new Map<string, readonly string[]>();
  for (const edge of graph.edges) {
    if (!edge.toModuleId) continue;
    dependencyByModuleId.set(edge.fromModuleId, [
      ...(dependencyByModuleId.get(edge.fromModuleId) ?? []),
      edge.toModuleId,
    ]);
  }

  const providerModules = input.providerSelections.map((selection) => {
    const key = selectionKey(selection);
    const moduleId = providerBootResourceModuleId(key);
    const dependencies = [
      ...(dependencyByModuleId.get(moduleId) ?? []),
      ...(ownsEffectRuntime ? [effectRuntimeModuleId] : []),
    ];
    const provider = selection.provider as RuntimeProvider<any, unknown>;

    input.catalog?.module({
      moduleId,
      dependencies,
      metadata: {
        profileId: input.profileId,
        resourceId: key.resourceId,
        providerId: key.providerId,
        lifetime: key.lifetime,
        role: key.role,
        instance: key.instance,
      },
    });

    return {
      id: moduleId,
      dependsOn: dependencies,
      async start() {
        const rawConfig = await providerConfigFor({
          selection,
          key,
          configStore,
          secretStore: input.secretStore,
        });
        const config = provider.configSchema
          ? provider.configSchema.parse(rawConfig.value)
          : rawConfig.value;
        const configSnapshot = safeConfigCatalogSnapshot(
          resolveConfigSnapshot({
            parsedConfig: config,
            rawSnapshot: rawConfig.snapshot,
            schemaRedacted: provider.configSchema?.redacted === true,
          }),
        );
        const context: ProviderBuildContext<unknown> = {
          config,
          resources: resourcesForDependencies({
            dependencies,
            provisioned: provisionedValues,
          }),
          scope: {
            processId: input.processId,
            role: key.role,
          },
          telemetry: {
            event: (name, attributes) =>
              input.catalog?.record({
                phase: "provider.telemetry",
                subjectId: moduleId,
                attributes: { name, ...(attributes ?? {}) },
              }),
          },
          diagnostics: {
            report: (message, attributes) =>
              input.catalog?.record({
                phase: "provider.diagnostic",
                subjectId: moduleId,
                attributes: { message, ...(attributes ?? {}) },
              }),
          },
        };

        const internals = providerPlanInternals<unknown>(
          provider.build(context),
          provider.id,
        );
        input.catalog?.record({
          phase: "provider.acquire.start",
          subjectId: moduleId,
          attributes: {
            providerId: provider.id,
            resourceId: selection.resource.id,
            config: configSnapshot,
          },
        });
        const acquireEffect = effectBodyToRawrEffect(
          () => internals.acquire(),
          undefined,
        );
        const acquireExit = await getEffectRuntime().runPromiseExit(acquireEffect);
        if (acquireExit._tag !== "Success") {
          input.catalog?.record({
            phase: "provider.acquire.failure",
            subjectId: moduleId,
            attributes: { providerId: provider.id, cause: acquireExit.cause },
          });
          throw acquireExit.cause;
        }

        const provisioned = {
          kind: "provider.provisioned-value" as const,
          key,
          value: acquireExit.value,
        };
        provisionedValues.set(moduleId, provisioned);
        input.catalog?.record({
          phase: "provider.acquire.success",
          subjectId: moduleId,
          attributes: {
            providerId: provider.id,
            resourceId: selection.resource.id,
            provisioned: true,
          },
        });

        return {
          value: provisioned,
          records: [
            {
              kind: "runtime.provider.provisioned",
              attributes: {
                moduleId,
                providerId: provider.id,
                resourceId: selection.resource.id,
              },
            } satisfies RuntimeTopologyRecord,
          ],
          async finalize() {
            provisionedValues.delete(moduleId);
            if (!internals.release) return;
            input.catalog?.record({
              phase: "provider.release.start",
              subjectId: moduleId,
              attributes: { providerId: provider.id, resourceId: selection.resource.id },
            });
            const releaseEffect = effectBodyToRawrEffect(
              internals.release,
              provisioned.value,
            );
            const releaseExit = await getEffectRuntime().runPromiseExit(releaseEffect);
            input.catalog?.record({
              phase: releaseExit._tag === "Success"
                ? "provider.release.success"
                : "provider.release.failure",
              subjectId: moduleId,
              attributes: {
                providerId: provider.id,
                resourceId: selection.resource.id,
                exit: releaseExit._tag,
              },
            });
            if (releaseExit._tag !== "Success") throw releaseExit.cause;
          },
        };
      },
    };
  });

  if (!ownsEffectRuntime) return providerModules;

  input.catalog?.module({
    moduleId: effectRuntimeModuleId,
    metadata: {
      processId: input.processId,
      runtime: "effect",
    },
  });

  return [
    {
      id: effectRuntimeModuleId,
      start() {
        getEffectRuntime();
        input.catalog?.record({
          phase: "runtime.effect-runtime.start",
          subjectId: effectRuntimeModuleId,
          attributes: { processId: input.processId },
        });
        return {
          records: [
            {
              kind: "runtime.effect-runtime.started",
              attributes: { processId: input.processId },
            } satisfies RuntimeTopologyRecord,
          ],
          async finalize() {
            input.catalog?.record({
              phase: "runtime.effect-runtime.dispose",
              subjectId: effectRuntimeModuleId,
              attributes: { processId: input.processId },
            });
            await getEffectRuntime().dispose();
          },
        };
      },
    },
    ...providerModules,
  ];
}

export async function startProviderProvisioning(input: ProviderProvisioningInput) {
  return startRuntimeBootgraph(createProviderProvisioningBootModules(input));
}
