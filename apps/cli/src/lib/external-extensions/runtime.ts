import type { Config } from "@oclif/core";

import type { ExternalExtensionCommandRuntime } from "./service";

const runtimes = new WeakMap<Config, ExternalExtensionCommandRuntime>();

export function registerExternalExtensionRuntime(
  config: Config,
  runtime: ExternalExtensionCommandRuntime,
): void {
  if (runtimes.has(config)) throw new Error("EXTERNAL_EXTENSION_RUNTIME_ALREADY_CONFIGURED");
  runtimes.set(config, runtime);
}

export function resolveExternalExtensionRuntime(config: Config): ExternalExtensionCommandRuntime {
  const runtime = runtimes.get(config);
  if (!runtime) throw new Error("EXTERNAL_EXTENSION_RUNTIME_NOT_CONFIGURED");
  return runtime;
}
