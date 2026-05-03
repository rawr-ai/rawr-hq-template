import { RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../../../lib/hq-ops-client";

/**
 * Lists explicit sync sources persisted in global RAWR config.
 */
export default class PluginsSyncSourcesList extends RawrCommand {
  static description = "List explicitly-registered sync sources from ~/.rawr/config.json";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsSyncSourcesList);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const response = await createHqOpsClient(process.cwd()).config.listGlobalSyncSources(
      {},
      createHqOpsCallOptions("plugin-plugins.sync-sources.list"),
    );
    const result = this.ok({ path: response.path, sources: response.sources });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (response.path) this.log(response.path);
        for (const source of response.sources) this.log(`- ${source}`);
      },
    });
  }
}
