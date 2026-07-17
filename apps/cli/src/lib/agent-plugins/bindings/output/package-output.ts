import {
  coworkV1PackageDigest,
  createResourcePackageOutputRuntime,
  type ResourcePackageOutputOptions,
} from "@rawr/agent-plugin-lifecycle/ports/packaging";
import { makeNodePackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";

export type PackageOutputBindingOptions = Omit<ResourcePackageOutputOptions, "packageOutput">;

/** Selects the controller's Effect Platform Node package-output provider. */
export function createPackageOutputLifecycleRuntime(options: PackageOutputBindingOptions) {
  return createResourcePackageOutputRuntime({
    ...options,
    packageOutput: makeNodePackageOutputAsyncPort(),
  });
}

export { coworkV1PackageDigest };
