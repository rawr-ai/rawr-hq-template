/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This is the single package-wide middleware composition point.
 * Import the root contract here, derive the central implementer once, and let
 * modules consume `service.<module>` subtrees from there.
 *
 * @agents
 * This file is the only package-wide runtime assembly seam. Required service
 * observability semantics are supplied here exactly once; extra providers and guards are
 * layered here after that.
 */

import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";
import { readOnlyMode } from "./middleware/read-only-mode.middleware";
import { stores } from "./middleware/stores.middleware";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) service-owned observability and analytics
 * 2) service-owned store projection
 * 3) the read-only policy guard
 *
 * Do not attach another generic observability or analytics lifecycle here.
 * Qualified module telemetry belongs on the corresponding module branch.
 */
/** Unconfigured contract implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

export const service = impl.use(observability).use(analytics).use(stores).use(readOnlyMode);
