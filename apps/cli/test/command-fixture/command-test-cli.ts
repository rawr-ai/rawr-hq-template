import { Config, flush, handle, run } from "@oclif/core";
import { bindVerifiedControllerReentryAuthority } from "@rawr/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Unit-command harness only. Controller/runtime acceptance must use the installed launcher.
const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
bindVerifiedControllerReentryAuthority({
  runtimePath: process.execPath,
  entryPath: fileURLToPath(import.meta.url),
  releaseRoot: cliRoot,
  dataRoot: cliRoot,
  controllerDigest: "0".repeat(64),
  operatorCwd: process.cwd(),
  operatorHome: process.env.HOME,
  operatorConfigHome: process.env.XDG_CONFIG_HOME,
});
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
