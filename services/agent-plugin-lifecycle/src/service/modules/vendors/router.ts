import { createVendorStatus, createVendorUpdate } from "./internal/application";
import { module } from "./module";

const status = module.status.handler(async ({ context, input }) => {
  return createVendorStatus(context.runtime)(input);
});

const update = module.update.handler(async ({ context, input }) => {
  return createVendorUpdate(context.runtime)(input);
});

export const router = module.router({ status, update });
