import { RawrCommand } from "@rawr/core";
import { loadRawrConfig } from "@rawr/control-plane";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class ConfigShow extends RawrCommand {
  static description = "Show the resolved rawr.config.ts (if present)";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(ConfigShow);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const loaded = await loadRawrConfig(workspaceRoot);
    if (loaded.error) {
      const result = this.fail(loaded.error.message, { details: loaded.error });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(loaded.error?.message);
          if (loaded.error?.cause) this.log(loaded.error.cause);
        },
      });
      this.exit(1);
      return;
    }

    const result = this.ok({ path: loaded.path, config: loaded.config });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (!loaded.path || !loaded.config) {
          this.log("no rawr.config.ts found");
          return;
        }
        this.log(loaded.path);
        this.log(JSON.stringify(loaded.config, null, 2));
      },
    });
  }
}

