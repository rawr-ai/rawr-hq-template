import { RawrCommand } from "@rawr/core";
import { createHqOpsClient, createHqOpsInvocation } from "../../../../lib/hq-ops-client";

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
      createHqOpsInvocation("plugin-plugins.sync-sources.list"),
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
