import "@habitat-ai/sdk/plugins/server/effect";
import type { EffectContext } from "@habitat-ai/sdk/effect/context";
import { implement } from "@orpc/server";
import type { Context as ServiceContext } from "./base.js";
import { contract } from "./contract.js";

// The implementation admits native bridge wiring without adding a service lane.
type Context = ServiceContext & { readonly "effect/context": EffectContext<never> };

/** Unconfigured Habitat implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Root Habitat lineage with the official Effect-oRPC extension admitted once. */
export const service = impl;
