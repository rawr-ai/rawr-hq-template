/**
 * @fileoverview Central oRPC implementer for the hyperresearch-codex package.
 */
import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";

/** Unconfigured contract implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Configured service stage inherited by every module branch. */
export const service = impl.use(observability).use(analytics);
