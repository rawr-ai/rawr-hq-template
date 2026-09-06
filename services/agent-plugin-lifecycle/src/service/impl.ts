import "@habitat-ai/sdk/plugins/server/effect";
import type { EffectContext } from "@habitat-ai/sdk/effect/context";
import { implement } from "@orpc/server";
import type { Context as ServiceContext } from "./base";
import { contract } from "./contract";

type Context = ServiceContext & { readonly "effect/context": EffectContext<never> };

/** Unconfigured lifecycle implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Native service lineage; runtime tracing does not require duplicate root middleware. */
export const service = impl;
