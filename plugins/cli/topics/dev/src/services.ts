import { serviceRuntimeExport } from "@habitat-ai/dev-service/client";
import { useService } from "@habitat-ai/sdk/plugins/cli";

/** One app-bound developer service shared by every retained command. */
export const services = { dev: useService(serviceRuntimeExport) } as const;
