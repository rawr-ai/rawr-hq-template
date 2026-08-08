import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXACT_SEMVER_PATTERN =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const cliPackageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));

/** Returns the exact SDK version paired with the installed Habitat CLI. */
export function installedSdkVersion(): string {
  const manifest = JSON.parse(readFileSync(cliPackageJsonPath, "utf8")) as {
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
