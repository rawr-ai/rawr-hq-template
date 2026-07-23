import { implement } from "@orpc/server";
import type { Context } from "./base";
import { contract } from "./contract";

/** Native oRPC implementer for the embedded Example Todo API service. */
export const service = implement(contract).$context<Context>();
