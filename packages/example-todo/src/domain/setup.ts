/**
 * @fileoverview Domain setup surface for the todo package.
 *
 * @remarks
 * This is the single file modules should import to get the configured oRPC kit:
 * - `ocBase` for contract authoring
 * - `osBase` for middleware authoring (base builder; no baked-in middleware)
 *
 * Modules should derive their implementers from the central implementer in
 * `src/orpc.ts` (the oRPC-native composition point for middleware + contract).
 *
 * Keep this file domain-authored (concrete values live here). The kit factory
 * implementation lives under `../orpc/*`.
 */
import { oc } from "@orpc/contract";
import { os } from "@orpc/server";

import type { BaseMetadata, InitialContext } from "../orpc-sdk";

import type { Deps } from "./deps";

const baseMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
} satisfies BaseMetadata;

// -------------------------------------------------------------------------------------
// PREVIOUS (kit-based) setup (kept as a reference while we stage and evaluate the kit):
//
//   import { createOrpcKit } from "../orpc-sdk";
//   const kit = createOrpcKit<Deps>({ baseMetadata });
//   export const oc = kit.oc;
//   export const os = kit.os;
//
// -------------------------------------------------------------------------------------
// CURRENT (manual) setup:
//
// Goal: make the wiring obvious so we can decide what the kit actually must do.
// Nothing here should be "clever": it should mirror oRPC-native usage.
// -------------------------------------------------------------------------------------

export const ocBase = oc.$meta<BaseMetadata>(baseMetadata);

export const osBase = os
  .$context<InitialContext<Deps>>()
  .$meta<BaseMetadata>(baseMetadata);
