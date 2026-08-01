import "@orpc/experimental-effect/extensions/effect";
import { implement } from "@orpc/server";
import type { Context } from "./base.js";
import { contract } from "./contract.js";

/** Unconfigured Habitat implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Root Habitat lineage with the official Effect-oRPC extension admitted once. */
export const service = impl;
