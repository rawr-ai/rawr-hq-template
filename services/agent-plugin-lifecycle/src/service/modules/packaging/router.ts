import { module } from "./module";
import { createPackageAgentPluginApplication } from "./internal/package-agent-plugin";

const packageArtifact = module.package.handler(async ({ context, input }) => {
  return createPackageAgentPluginApplication(context.runtime).package(input);
});

export const router = module.router({
  package: packageArtifact,
});
