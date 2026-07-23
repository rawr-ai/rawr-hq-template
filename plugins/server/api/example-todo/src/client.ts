import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink, type OpenAPILinkOptions } from "@orpc/openapi-client/fetch";
import { contract } from "./service/contract";

type Context = Record<never, never>;

/** Caller-facing client for the Example Todo API operations. */
export type Client = JsonifiedClient<ContractRouterClient<typeof contract, Context>>;

/** Transport options accepted by the caller-owned OpenAPI link. */
export type CreateClientOptions = Pick<OpenAPILinkOptions<Context>, "fetch" | "headers" | "url">;

/** Creates a caller-owned client without constructing server or domain state. */
export function createClient(options: CreateClientOptions): Client {
  const link = new OpenAPILink<Context>(contract, options);
  return createORPCClient(link);
}

export { contract };
