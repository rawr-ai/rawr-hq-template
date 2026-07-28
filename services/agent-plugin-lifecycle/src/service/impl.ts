import "@orpc/experimental-effect/extensions/effect";
import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { middleware as analytics } from "./middleware/analytics";
import { middleware as observability } from "./middleware/observability";

/** Unconfigured lifecycle implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Root implementer with service-owned observability and analytics. */
export const service = impl.use(observability).use(analytics);
