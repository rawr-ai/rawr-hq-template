import { Config } from "@oclif/core";

const root = process.argv[2];
if (!root) throw new Error("CLI root argument is required");

const config = await Config.load({
  devPlugins: false,
  root,
  userPlugins: false,
});

process.stdout.write(JSON.stringify([...config.commandIDs].sort()));
