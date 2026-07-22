import { Plugin } from "@oclif/core";

const root = process.argv[2];
if (!root) throw new Error("Oclif plugin root argument is required");

const plugin = new Plugin({
  errorOnManifestCreate: true,
  ignoreManifest: true,
  respectNoCacheDefault: true,
  root,
  type: "core",
});
await plugin.load();

process.stdout.write(
  JSON.stringify({
    commandIds: [...plugin.commandIDs].sort(),
    hasManifest: plugin.hasManifest,
    relativePaths: Object.values(plugin.manifest.commands)
      .map((command) => {
        if (!command.relativePath) throw new Error(`Command ${command.id} has no relative path`);
        return command.relativePath;
      })
      .sort((left, right) => left.join("/").localeCompare(right.join("/"))),
  })
);
