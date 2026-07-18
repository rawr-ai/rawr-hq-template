import { Config, flush, handle, run } from "@oclif/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Owner-local command harness: load the devops extension exactly as Oclif does.
const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = await Config.load({
  root: pluginRoot,
  userPlugins: false,
  devPlugins: false,
  jitPlugins: false,
});

try {
  await run(process.argv.slice(2), config);
  await flush();
} catch (error) {
  handle(error instanceof Error ? error : new Error(String(error)));
}
