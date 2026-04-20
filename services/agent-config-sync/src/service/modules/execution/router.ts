import { module } from "./module";
import { resolveProviderContent as resolveServiceProviderContent } from "../source-content/lib/provider-content";

const runSync = module.runSync.handler(async ({ context, input }) => {
  return context.repo.runSync(input);
});

const resolveProviderContent = module.resolveProviderContent.handler(async ({ context, input }) => {
  return resolveServiceProviderContent({
    agent: input.agent,
    sourcePlugin: input.sourcePlugin,
    base: input.base,
    resources: context.resources,
  });
});

export const router = module.router({
  runSync,
  resolveProviderContent,
});
