/**
 * @fileoverview Shared service-base types for the todo package.
 *
 * @remarks
 * Keep reusable service-definition types here so sibling files under
 * `src/service/base/` can depend on them without importing the assembly
 * manifest in `index.ts`.
 *
 * The service boundary should be authored once through `ServiceTypesOf<...>`.
 * This file exports the single canonical `Service` type plus any truly shared
 * support types like `Clock`. SDK helpers should project out `Context`,
 * `Metadata`, and `Deps` internally instead of making author code do it.
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
export type Service = ServiceTypesOf<{
  deps: {
    dbPool: DbPool;
    clock: Clock;
  };
  scope: {
    workspaceId: string;
  };
  config: {
    readOnly: boolean;
    limits: {
      maxAssignmentsPerTask: number;
    };
  };
  invocation: {
    traceId: string;
  };
  metadata: {
    audit?: "none" | "basic" | "full";
    entity?: "service" | "task" | "tag" | "assignment";
  };
}>;
