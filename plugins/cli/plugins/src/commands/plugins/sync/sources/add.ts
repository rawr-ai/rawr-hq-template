import os from "node:os";
import path from "node:path";

import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../../lib/hq-ops-client";

/**
 * Expands user-facing home paths before saving explicit sync sources.
 */
function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

/**
 * Adds a global explicit sync source through HQ Ops config procedures.
 */
export default class PluginsSyncSourcesAdd extends RawrCommand {
  static description = "Add an explicit sync source path to ~/.rawr/config.json";

  static args = {
    path: Args.string({ description: "Path to a plugin root (or content root)", required: true }),
  };

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsSyncSourcesAdd);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const input = String(args.path);
    const resolved = path.resolve(process.cwd(), expandTilde(input));

    const response = await createHqOpsClient(process.cwd()).config.addGlobalSyncSource(
      { path: resolved },
      createHqOpsCallOptions("plugin-plugins.sync-sources.add"),
    );

    const result = this.ok({ path: response.path, added: resolved, sources: response.sources });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`added: ${resolved}`);
      },
    });
  }
}
