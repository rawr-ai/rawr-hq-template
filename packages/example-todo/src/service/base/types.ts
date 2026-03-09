/**
 * @fileoverview Shared service-base types for the todo package.
 *
 * @remarks
 * Keep reusable service-definition types here so sibling files under
 * `src/service/base/` can depend on them without importing the assembly
 * manifest in `index.ts`.
 */
import type {
  DbPool,
  ServiceContextOf,
  ServiceDepsOf,
  ServiceMetadataOf,
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

/**
 * Host-owned dependencies for the todo service.
 *
 * @remarks
 * This is the explicit dependency contract at the service boundary.
 * Baseline deps vs service deps stays a type-authoring distinction only.
 */
export interface ServiceDeps extends ServiceDepsOf<{
  dbPool: DbPool;
  clock: Clock;
}> {}

/**
 * Initial service context.
 *
 * @remarks
 * Keep the semantic lane model explicit here. Construction-time bags are
 * `deps`, `scope`, and `config`; per-call input is `invocation`.
 */
export type ServiceContext = ServiceContextOf<
  ServiceDeps,
  ServiceScope,
  ServiceConfig,
  ServiceInvocation
>;

/**
 * Service-specific procedure metadata.
 *
 * @remarks
 * Keep this small and operational. These are the metadata fields service-local
 * middleware and policy can reasonably depend on.
 */
export type ServiceMetadata = ServiceMetadataOf<{
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
}>;
