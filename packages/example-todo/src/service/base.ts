/**
 * @fileoverview Service base primitives for the todo package.
 *
 * @remarks
 * This is the single file modules should import to get the configured oRPC primitives:
 * - `ocBase` for contract authoring
 * - `osBase` for middleware authoring (base builder; no baked-in middleware)
 *
 * Modules should derive their implementers from the central implementer in
 * `src/service/impl.ts` (the oRPC-native composition point for middleware + contract).
 *
 * Keep this file domain-authored (concrete values live here). The SDK factory
 * implementation lives under `../orpc/*`.
 */
import { oc } from "@orpc/contract";
import { os } from "@orpc/server";

import type { BaseMetadata, InitialContext } from "../orpc-sdk";

import type { Deps } from "./deps";

/**
 * Service-specific metadata extension (wireframe).
 *
 * @remarks
 * This is a realistic example of "domain-driven" metadata that a service might
 * standardize so baseline middleware (telemetry/audit/policy) can tag behavior
 * consistently without every module inventing a new shape.
 *
 * This package does not *use* these fields yet; they're here to help us shape
 * the eventual shared SDK API around what `service/base.ts` needs to express.
 */
export type ServiceMetadata = BaseMetadata & {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
};

const baseMetadata: ServiceMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
  audit: "basic",
  entity: "service",
};

/**
 * Initial (extended) context for this service (wireframe).
 *
 * @remarks
 * These are plausible service-level additions that are useful across modules.
 * Keep them optional while we wireframe ergonomics so we don't force runtime
 * call sites to change during this spike.
 */
export type ServiceContext = InitialContext<
  Deps,
  {
    workspaceId?: string;
    requestId?: string;
  }
>;

/**
 * Declarative (proto-SDK-shaped) setup.
 *
 * @remarks
 * Target ergonomics: types + defaults + one call per builder.
 */
export const ocBase = oc.$meta<ServiceMetadata>(baseMetadata);

export const osBase = os.$context<ServiceContext>().$meta<ServiceMetadata>(baseMetadata);
