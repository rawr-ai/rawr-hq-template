import { loadGlobalRawrConfig, rawrGlobalConfigPath } from "@rawr/control-plane";
import { RawrCommand } from "@rawr/core";

export default class PluginsSyncSourcesList extends RawrCommand {
  static description = "List explicitly-registered sync sources from ~/.rawr/config.json";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsSyncSourcesList);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const loaded = await loadGlobalRawrConfig();
    if (loaded.error) {
      const result = this.fail(loaded.error.message, { details: loaded.error });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const paths = loaded.config?.sync?.sources?.paths ?? [];
    const result = this.ok({ path: rawrGlobalConfigPath(), sources: paths });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(rawrGlobalConfigPath());
        for (const p of paths) this.log(`- ${p}`);
      },
    });
  }
}
