import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { provisionHabitatBinary } from "./provision.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function requestedArguments() {
  const supplied = process.argv.slice(2);
  if (
    supplied.some((argument) => argument === "--repo-root" || argument.startsWith("--repo-root="))
  ) {
    throw new Error("RAWR Habitat checks always use the current Template repository root");
  }
  return supplied.length === 0 ? ["--owner", "@rawr/agent-plugin-lifecycle"] : supplied;
}

try {
  const binary = await provisionHabitatBinary();
  const result = spawnSync(
    binary,
    ["check", "--repo-root", REPOSITORY_ROOT, ...requestedArguments()],
    { stdio: "inherit", env: process.env }
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 2;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
