import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { middleware as client } from "./middleware/client";

/** Unconfigured implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Configured implementer used by module operation authors. */
export const service = impl.use(client);
