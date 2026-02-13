import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateOrpcOpenApiSpec } from "../src/orpc";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(scriptDir, "..");

function resolveOutputPath(): string {
  const fromArg = process.argv[2];
  if (typeof fromArg === "string" && fromArg.trim() !== "") {
    return path.resolve(process.cwd(), fromArg);
  }
  return path.join(serverRoot, "openapi", "orpc-openapi.json");
}

async function main() {
  const outputPath = resolveOutputPath();
  const baseUrl = process.env.RAWR_ORPC_OPENAPI_BASE_URL?.trim() || "http://localhost:3000";
  const spec = await generateOrpcOpenApiSpec(baseUrl);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");

  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
