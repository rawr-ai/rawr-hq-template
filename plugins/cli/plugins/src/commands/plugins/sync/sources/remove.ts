import os from "node:os";
import path from "node:path";

import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../../lib/hq-ops-client";

function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export default class PluginsSyncSourcesRemove extends RawrCommand {
  static description = "Remove an explicit sync source path from ~/.rawr/config.json";

  static args = {
    path: Args.string({ description: "Path to remove (will be resolved to an absolute path)", required: true }),
  };

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsSyncSourcesRemove);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const input = String(args.path);
    const resolved = path.resolve(process.cwd(), expandTilde(input));

    const response = await createHqOpsClient(process.cwd()).config.removeGlobalSyncSource(
      { path: resolved },
      createHqOpsCallOptions("plugin-plugins.sync-sources.remove"),
    );

    const result = this.ok({ path: response.path, removed: resolved, sources: response.sources });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`removed: ${resolved}`);
      },
    });
  }
}
