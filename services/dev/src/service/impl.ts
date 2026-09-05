import "@habitat-ai/sdk/plugins/server/effect";
import type { EffectContext } from "@habitat-ai/sdk/effect/context";
import { implement } from "@orpc/server";
import type { Context as ServiceContext } from "./base";
import { contract } from "./contract";

type Context = ServiceContext & { readonly "effect/context": EffectContext<never> };

/** Native contract implementation lineage and sole Effect bridge bootstrap. */
export const impl = implement(contract).$context<Context>();

/** No domain-unused middleware is needed to construct the service lineage. */
export const service = impl;
