import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { middleware as analytics } from "./middleware/analytics";
import { middleware as observability } from "./middleware/observability";
import { middleware as scratchPolicy } from "./middleware/scratch-policy";

/** Unconfigured contract implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Configured service stage inherited by every module branch. */
export const service = impl.use(observability).use(analytics).use(scratchPolicy);
