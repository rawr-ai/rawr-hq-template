import { serviceRuntimeExport } from "@habitat-ai/catalog-service/client";
import { useService } from "@habitat-ai/sdk/plugins/cli";

export const services = {
  catalog: useService(serviceRuntimeExport, {
    binding: {
      scope: { kind: "runtime.config", key: "habitat.catalog.scope" },
      config: { kind: "runtime.config", key: "habitat.catalog.config" },
    },
  }),
} as const;
