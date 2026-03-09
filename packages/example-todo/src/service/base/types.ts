/**
 * @fileoverview Shared service-base types for the todo package.
 *
 * @remarks
 * Keep reusable service-definition types here so sibling files under
 * `src/service/base/` can depend on them without importing the assembly
 * manifest in `index.ts`.
 *
 * This file is no longer hand-composing each service type separately. Instead,
 * it uses the single `ServiceTypesOf<...>` helper so the service boundary stays
 * one declaration block while still preserving the baseline helper seam.
 */
import type {
  DbPool,
  ServiceTypesOf,
} from "../../orpc-sdk";

/**
 * Host-owned time source used by task/tag creation and similar flows.
 */
export interface Clock {
  now(): string;
}

/**
 * Stable client scope for the todo package.
 */
export interface ServiceScope {
  workspaceId: string;
}

/**
 * Stable package configuration for the todo package.
 */
export interface ServiceConfig {
  readOnly: boolean;
  limits: {
    maxAssignmentsPerTask: number;
  };
}

/**
 * Invocation-scoped input for the todo package.
 */
export interface ServiceInvocation {
  traceId: string;
}

type TodoServiceTypes = ServiceTypesOf<{
  deps: {
    dbPool: DbPool;
    clock: Clock;
  };
  scope: ServiceScope;
  config: ServiceConfig;
  invocation: ServiceInvocation;
  metadata: {
    audit?: "none" | "basic" | "full";
    entity?: "service" | "task" | "tag" | "assignment";
  };
}>;

/**
 * Host-owned dependencies for the todo service.
 *
 * @remarks
 * This is the explicit dependency contract at the service boundary.
 * Baseline deps vs service deps stays a type-authoring distinction only.
 */
export type ServiceDeps = TodoServiceTypes["Deps"];

/**
 * Initial service context.
 *
 * @remarks
 * Keep the semantic lane model explicit here. Construction-time bags are
 * `deps`, `scope`, and `config`; per-call input is `invocation`.
 */
export type ServiceContext = TodoServiceTypes["Context"];

/**
 * Service-specific procedure metadata.
 *
 * @remarks
 * Keep this small and operational. These are the metadata fields service-local
 * middleware and policy can reasonably depend on.
 */
export type ServiceMetadata = TodoServiceTypes["Metadata"];
