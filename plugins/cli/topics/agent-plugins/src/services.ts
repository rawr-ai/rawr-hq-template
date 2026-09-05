import { serviceRuntimeExport } from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { useService } from "@habitat-ai/sdk/plugins/cli";

/** One app-bound lifecycle service shared by every command in this topic. */
export const services = { lifecycle: useService(serviceRuntimeExport) } as const;
