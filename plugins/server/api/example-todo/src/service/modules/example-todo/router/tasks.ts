import { createApiTraceForwardingOptions } from "@habitat-ai/rawr-hq-sdk/apis";
import { module } from "../module";

/** Creates a Todo task through the request-resolved domain client. */
const create = module.tasks.create.handler(async ({ context, input }) => {
  return context.client.tasks.create(input, createApiTraceForwardingOptions(context));
});

/** Gets a Todo task through the request-resolved domain client. */
const get = module.tasks.get.handler(async ({ context, input }) => {
  return context.client.tasks.get(input, createApiTraceForwardingOptions(context));
});

/**
 * Task operations share one curated client and trace-forwarding boundary.
 *
 * @purpose Expose the Example Todo task operations as one API capability group.
 * @capability Create and retrieve tasks through the request-resolved client.
 * @behavior Forward request trace identity and preserve domain outcomes unchanged.
 * @relation Completes the task branch consumed by the Example Todo module router.
 */
export const tasks = { create, get };
