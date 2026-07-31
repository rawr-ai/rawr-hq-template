/**
 * @fileoverview Central oRPC implementer for the HQ Ops package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `service.<module>` branches from there.
 *
 * @agents
 * This file is the only package-wide runtime assembly seam. Required service
 * observability semantics are supplied here exactly once.
 */

import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { middleware as analytics } from "./middleware/analytics";
import { middleware as journal } from "./middleware/journal";
import { middleware as observability } from "./middleware/observability";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) service-owned observability
 * 2) service-owned analytics
 * 3) service-owned Journal store projection
 */
/** Unconfigured contract implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Configured service stage inherited by every module branch. */
export const service = impl.use(observability).use(analytics).use(journal);
