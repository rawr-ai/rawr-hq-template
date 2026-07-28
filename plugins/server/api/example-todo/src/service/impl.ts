import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { client } from "./middleware/client.middleware";

/** Unconfigured implementer used for aggregate router implementation. */
export const impl = implement(contract).$context<Context>();

/** Configured implementer used by module operation authors. */
export const service = impl.use(client);
