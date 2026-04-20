import { module } from "./module";
import { resolveProviderContent as resolveServiceProviderContent } from "../source-content/lib/provider-content";

/**
 * Execution procedure for running the sync engine through the module repository.
 */
const runSync = module.runSync.handler(async ({ context, input }) => {
  return context.repo.runSync(input);
});

/**
 * Read-only execution procedure that exposes source-content overlay policy
 * without granting the caller direct access to service internals.
 */
const resolveProviderContent = module.resolveProviderContent.handler(async ({ context, input }) => {
  return resolveServiceProviderContent({
    agent: input.agent,
    sourcePlugin: input.sourcePlugin,
    base: input.base,
    resources: context.resources,
  });
});

/**
 * Router export for agent destination sync execution.
 */
export const router = module.router({
  runSync,
  resolveProviderContent,
});
