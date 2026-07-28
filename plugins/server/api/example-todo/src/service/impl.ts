import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";
import { client } from "./middleware/client.middleware";

/** Native oRPC implementer for the embedded Example Todo API service. */
export const service = implement(contract).$context<Context>().use(client);
