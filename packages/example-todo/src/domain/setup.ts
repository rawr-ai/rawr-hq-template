/**
 * @fileoverview Domain setup surface for the todo package.
 *
 * @remarks
 * This is the single file modules should import to get the configured oRPC kit:
 * - `oc` for contract authoring
 * - `os` for middleware authoring (base builder; no baked-in middleware)
 *
 * Modules should derive their implementers from the central implementer in
 * `src/orpc.ts` (the oRPC-native composition point for middleware + contract).
 *
 * Legacy kit exports (`ship`, `implementModuleRouter`) are kept temporarily to
 * avoid churn while we converge on the final abstraction.
 *
 * Keep this file domain-authored (concrete values live here). The kit factory
 * implementation lives under `../orpc/*`.
 */
import { createOrpcKit } from "../orpc-sdk";
import type { BaseMetadata } from "../orpc-sdk";

import type { Deps } from "./deps";

const baseMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
} satisfies BaseMetadata;

const kit = createOrpcKit<Deps>({
  baseMetadata,
});

export const oc = kit.oc;
export const os = kit.os;
export const ship = kit.ship;
export const implementModuleRouter = kit.implementModuleRouter;
