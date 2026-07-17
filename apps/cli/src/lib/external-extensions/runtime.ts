import type { Config } from "@oclif/core";

import type { ExternalExtensionCommandRuntime } from "./service";

// Oclif reloads a supplied Config before dispatch. The root Plugin instance is
// intentionally preserved across that reload, while the Config instance is not.
const runtimes = new WeakMap<object, ExternalExtensionCommandRuntime>();

export function registerExternalExtensionRuntime(
  config: Config,
  runtime: ExternalExtensionCommandRuntime,
): void {
  const owner = runtimeOwner(config);
  if (runtimes.has(owner)) throw new Error("EXTERNAL_EXTENSION_RUNTIME_ALREADY_CONFIGURED");
  runtimes.set(owner, runtime);
}

export function resolveExternalExtensionRuntime(config: Config): ExternalExtensionCommandRuntime {
  const runtime = runtimes.get(runtimeOwner(config));
  if (!runtime) throw new Error("EXTERNAL_EXTENSION_RUNTIME_NOT_CONFIGURED");
  return runtime;
}

function runtimeOwner(config: Config): object {
  const owner = config.plugins.get(config.pjson.name);
  if (!owner) throw new Error("EXTERNAL_EXTENSION_ROOT_NOT_CONFIGURED");
  return owner;
}
