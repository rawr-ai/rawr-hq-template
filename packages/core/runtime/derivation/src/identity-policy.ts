import { createHash } from "node:crypto";

import type { ExecutionDescriptorIdentityInput } from "./execution-descriptor-ref";
import type {
  NormalizedPluginIdentity,
  NormalizedResourceRequirementIdentity,
} from "./normalized-runtime-topology";
import type { NormalizedRuntimeConfigRef, ServiceBindingPlan } from "./service-binding-plan";

type ResourceRequirementOwnerInput =
  | { readonly kind: "process"; readonly processId: string }
  | { readonly kind: "plugin"; readonly pluginOwnerId: string }
  | { readonly kind: "service"; readonly serviceId: string; readonly localName: string }
  | { readonly kind: "provider"; readonly providerId: string };

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalString(value: string): string {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError("Canonical JSON forbids unpaired Unicode surrogates.");
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("Canonical JSON forbids unpaired Unicode surrogates.");
    }
  }
  return JSON.stringify(value);
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") return canonicalString(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON requires finite numbers.");
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("Canonical JSON number encoding failed.");
    return encoded;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError("Canonical JSON arrays must use the ordinary array prototype.");
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
      throw new TypeError("Canonical JSON arrays require an own data length.");
    }
    const length = lengthDescriptor.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
      throw new TypeError("Canonical JSON arrays require a finite non-negative length.");
    }
    const actualKeys = Reflect.ownKeys(value);
    if (
      actualKeys.length !== length + 1 ||
      actualKeys.some((key) => !isDenseArrayOwnKey(key, length))
    ) {
      throw new TypeError("Canonical JSON arrays accept only indexed values.");
    }
    const items: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError("Canonical JSON arrays require enumerable indexed data properties.");
      }
      items.push(canonicalJson(descriptor.value));
    }
    return `[${items.join(",")}]`;
  }
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Canonical JSON accepts only JSON values.");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Canonical JSON objects must be plain records.");
  }

  const properties: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new TypeError("Canonical JSON forbids symbol keys.");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Canonical JSON requires enumerable data properties.");
    }
    properties.push(key);
  }
  properties.sort(compareStrings);

  return `{${properties
    .map((key) => `${canonicalString(key)}:${canonicalJson(Reflect.get(value, key))}`)
    .join(",")}}`;
}

function isDenseArrayOwnKey(key: PropertyKey, length: number): boolean {
  if (key === "length") return true;
  if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

function digest(prefix: string, identity: unknown): string {
  const hex = createHash("sha256").update(canonicalJson(identity), "utf8").digest("hex");
  return `${prefix}${hex}`;
}

export function pluginOwnerId(plugin: NormalizedPluginIdentity): string {
  return digest("plugin-owner:sha256:", {
    kind: "plugin.owner-identity",
    plugin: {
      pluginId: plugin.pluginId,
      ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
    },
  });
}

export function serviceUseId(input: {
  readonly pluginOwnerId: string;
  readonly localName: string;
  readonly serviceId: string;
  readonly serviceInstance?: string;
}): string {
  return digest("service-use:sha256:", {
    kind: "service.use-identity",
    pluginOwnerId: input.pluginOwnerId,
    localName: input.localName,
    serviceId: input.serviceId,
    ...(input.serviceInstance === undefined ? {} : { serviceInstance: input.serviceInstance }),
  });
}

export function serviceDependencyId(input: {
  readonly serviceId: string;
  readonly localName: string;
  readonly dependencyServiceId: string;
}): string {
  return digest("service-dependency:sha256:", {
    kind: "service.dependency-identity",
    serviceId: input.serviceId,
    localName: input.localName,
    dependencyServiceId: input.dependencyServiceId,
  });
}

export function semanticDependencyId(input: {
  readonly serviceId: string;
  readonly localName: string;
  readonly adapterId: string;
}): string {
  return digest("semantic-dependency:sha256:", {
    kind: "semantic.dependency-identity",
    serviceId: input.serviceId,
    localName: input.localName,
    adapterId: input.adapterId,
  });
}

export function resourceRequirementId(input: {
  readonly owner: ResourceRequirementOwnerInput;
  readonly resource: NormalizedResourceRequirementIdentity;
  readonly optional: boolean;
}): string {
  return digest("resource-requirement:sha256:", {
    kind: "resource.requirement-identity",
    owner: input.owner,
    resource: input.resource,
    optional: input.optional,
  });
}

export function providerSelectionId(input: {
  readonly providerId: string;
  readonly resource: NormalizedResourceRequirementIdentity;
  readonly configRef?: NormalizedRuntimeConfigRef;
}): string {
  return digest("provider-selection:sha256:", {
    kind: "provider.selection-identity",
    providerId: input.providerId,
    resource: input.resource,
    ...(input.configRef === undefined ? {} : { configRef: input.configRef }),
  });
}

export function surfacePlanId(input: {
  readonly pluginOwnerId: string;
  readonly role: string;
  readonly surface: string;
  readonly capability: string;
}): string {
  return digest("surface-plan:sha256:", {
    kind: "surface.plan-identity",
    pluginOwnerId: input.pluginOwnerId,
    role: input.role,
    surface: input.surface,
    capability: input.capability,
  });
}

export function workflowDispatcherId(input: {
  readonly appId: string;
  readonly pluginOwnerId: string;
  readonly role: "async";
  readonly surface: "async/workflow";
  readonly capability: string;
  readonly workflowIds: readonly string[];
}): string {
  return digest("workflow-dispatcher:sha256:", {
    kind: "workflow.dispatcher-identity",
    appId: input.appId,
    pluginOwnerId: input.pluginOwnerId,
    role: input.role,
    surface: input.surface,
    capability: input.capability,
    workflowIds: input.workflowIds,
  });
}

export function executionDescriptorId(input: ExecutionDescriptorIdentityInput): string {
  return digest("execution-descriptor:sha256:", {
    kind: "execution.descriptor-identity",
    ...input,
  });
}

export function serviceBindingId(input: Omit<ServiceBindingPlan, "kind" | "bindingId">): string {
  return digest("service-binding:sha256:", {
    kind: "service.binding-identity",
    role: input.role,
    serviceId: input.serviceId,
    ...(input.serviceInstance === undefined ? {} : { serviceInstance: input.serviceInstance }),
    ...(input.scopeRef === undefined ? {} : { scopeRef: input.scopeRef }),
    ...(input.configRef === undefined ? {} : { configRef: input.configRef }),
    resourceRequirementIds: input.resourceRequirementIds,
    serviceDependencies: input.serviceDependencies,
    semanticDependencyIds: input.semanticDependencyIds,
  });
}

export function portableArtifactId(input: {
  readonly kind: "portable.runtime-plan-artifact";
  readonly identity: unknown;
  readonly profileId: string;
  readonly roles: readonly string[];
  readonly surfaces: readonly unknown[];
  readonly executionDescriptorRefs:
    | readonly ExecutionDescriptorIdentityInput[]
    | readonly unknown[];
}): string {
  return digest("sha256:", input);
}
