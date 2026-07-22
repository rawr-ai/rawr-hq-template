import path from "node:path";

export const CONTROLLER_DIRECTORY = "controller";
export const CONTROLLER_SELECTOR_FILE = "current";
export const CONTROLLER_RELEASES_DIRECTORY = "releases";
export const CONTROLLER_STAGING_DIRECTORY = "staging";
export const CONTROLLER_ENVELOPE_PATH = "controller-envelope.json";
export const CONTROLLER_RUNTIME_PATH = "runtime/bun";
export const CONTROLLER_RUNTIME_LICENSE_PATH = "runtime/LICENSE.txt";
export const CONTROLLER_ENTRY_PATH = "app/rawr.mjs";
export const CONTROLLER_DEPENDENCY_LOCK_PATH = "app/bun.lock";
export const CONTROLLER_LAUNCHER_PATH = "controller/bin/rawr";

export function controllerDirectory(dataRoot: string): string {
  return path.join(dataRoot, CONTROLLER_DIRECTORY);
}

export function controllerSelectorPath(dataRoot: string): string {
  return path.join(controllerDirectory(dataRoot), CONTROLLER_SELECTOR_FILE);
}

export function controllerReleasePath(dataRoot: string, digest: string): string {
  return path.join(controllerDirectory(dataRoot), CONTROLLER_RELEASES_DIRECTORY, digest);
}

export function controllerLauncherPath(dataRoot: string): string {
  return path.join(dataRoot, CONTROLLER_LAUNCHER_PATH);
}

export function controllerDataRootFromRelease(releaseRoot: string): string {
  return path.resolve(releaseRoot, "../../..");
}
