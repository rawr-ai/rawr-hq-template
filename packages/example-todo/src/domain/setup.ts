/**
 * @fileoverview Domain setup surface for the todo package.
 *
 * @remarks
 * This is the single file modules should import to get the configured oRPC kit:
 * - `oc` for contract authoring
 * - `os` for middleware authoring (base builder; no baked-in middleware)
 * - `ship` for shipping composition (baked-in kit middleware)
 * - `implementModuleRouter` for module router implementation
 *
 * Keep this file domain-authored (concrete values live here). The kit factory
 * implementation lives under `../orpc/*`.
 */
import { createOrpcKit } from "../orpc";
import type { BaseMetadata } from "../orpc";

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
