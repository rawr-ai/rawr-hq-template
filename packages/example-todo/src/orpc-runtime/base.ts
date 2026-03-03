/**
 * @fileoverview Canonical ORPC runtime entrypoint for this domain package.
 *
 * @remarks
 * This is the single setup surface scaffold authors should check first for:
 * - initial context requirements
 * - base metadata defaults
 * - shared contract/runtime builder primitives
 *
 * Middleware implementations stay standalone in `./middleware/*`.
 */
import { oc, type ContractRouter } from "@orpc/contract";
import { implement, os } from "@orpc/server";

import type { Deps } from "./deps";

/**
 * SECTION: Initial Context (Always Present)
 *
 * Minimal caller-provided context available at procedure entry.
 *
 * @remarks
 * Author here only package-entry requirements (usually `deps`).
 * Do not put module-injected runtime values here (repos/services).
 */
export type InitialContext = {
  deps: Deps;
};

/**
 * SECTION: Base Metadata (Always Present)
 *
 * Shared metadata shape used by contracts and cross-cutting middleware.
 *
 * @remarks
 * Author generic metadata fields and package defaults here.
 * Do not author per-procedure metadata decisions here.
 */
export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

/**
 * Default metadata baseline for this domain package.
 *
 * @remarks
 * Individual procedures should override metadata via `.meta(...)` in module contracts.
 */
export const baseMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
} satisfies BaseMetadata;

/**
 * SECTION: Contract Builder (Always Present)
 *
 * Contract-first base for module contract definitions.
 *
 * @remarks
 * Use this in module `contract.ts` files as the starting point for procedures and metadata.
 */
export const contractBuilder = oc.$meta<BaseMetadata>(baseMetadata);

/**
 * SECTION: Middleware Builder (Always Present)
 *
 * Shared middleware authoring base.
 *
 * @remarks
 * Standalone middleware files should build from this so context/meta typing stays consistent.
 */
export const middlewareBuilder = os.$context<InitialContext>().$meta<BaseMetadata>(baseMetadata);

/**
 * SECTION: implementModuleRouter (Always Present)
 *
 * Baseline implementer used by each module router.
 *
 * @remarks
 * Add setup here only when the same runtime behavior must apply to every module.
 * Keep module-specific dependency wiring and module-local middleware in each module router.
 */
export function implementModuleRouter<TContract extends ContractRouter<BaseMetadata>>(contract: TContract) {
  return implement(contract).$context<InitialContext>();
}
