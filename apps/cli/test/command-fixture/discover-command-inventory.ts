import { Config } from "@oclif/core";

const root = process.argv[2];
if (!root) throw new Error("CLI root argument is required");

const config = await Config.load({
  devPlugins: false,
  jitPlugins: false,
  root,
  userPlugins: false,
});

const commands = config.commands
  .map(({ id, pluginName }) => ({ id, pluginName: pluginName ?? null }))
  .sort((left, right) => left.id.localeCompare(right.id));

process.stdout.write(JSON.stringify(commands));
