import { createApiTraceForwardingOptions } from "@rawr/hq-sdk/apis";
import type { ClientResolver } from "../../base";
import { bindModule } from "./module";

/** Task API operations delegated to the host-resolved domain-service client. */
export const router = (resolveClient: ClientResolver) => {
  const bound = bindModule(resolveClient);

  return bound.router({
    create: bound.create.handler(async ({ context, input }) => {
      return context.client.tasks.create(input, createApiTraceForwardingOptions(context));
    }),
    get: bound.get.handler(async ({ context, input }) => {
      return context.client.tasks.get(input, createApiTraceForwardingOptions(context));
    }),
  });
};
