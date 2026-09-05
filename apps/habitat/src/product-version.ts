import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const EXACT_SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** Resolves this CLI package through its own export, independent of bundled chunk placement. */
export function cliPackageRoot(): string {
  return dirname(createRequire(import.meta.url).resolve("@habitat-ai/cli/package.json"));
}

/** Returns the exact SDK version paired with the installed Habitat CLI. */
export function installedSdkVersion(): string {
  const manifest = JSON.parse(readFileSync(join(cliPackageRoot(), "package.json"), "utf8")) as {
    readonly version?: unknown;
    readonly dependencies?: Readonly<Record<string, unknown>>;
  };
  const version = manifest.dependencies?.["@habitat-ai/sdk"];
  if (
    typeof version !== "string" ||
    !EXACT_SEMVER_PATTERN.test(version) ||
    version !== manifest.version
  ) {
    throw new Error(
      "Installed @habitat-ai/cli and @habitat-ai/sdk must use one identical exact semantic version."
    );
  }
  return version;
}
