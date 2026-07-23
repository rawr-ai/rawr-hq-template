import path from "node:path";
import { fileURLToPath } from "node:url";
import { Config, flush, handle, run } from "@oclif/core";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const config = await Config.load({
  root: cliRoot,
  userPlugins: false,
  devPlugins: false,
  jitPlugins: false,
});

try {
  await run(process.argv.slice(2), config);
  await flush();
} catch (error) {
  handle(error as Error);
}
