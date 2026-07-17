import { module } from "./module";
import { executeExportAgentPlugins } from "./internal/export-agent-plugins";

const apply = module.apply.handler(async ({ context, input }) => {
  return executeExportAgentPlugins(input, context.runtime);
});

export const router = module.router({
  apply,
});
