import { RawrCommand } from "@rawr/core";
import { collectAndWriteHqStatus, formatHqStatusHuman } from "../../lib/hq-status";
import { findWorkspaceRoot } from "@rawr/core";

export default class HqStatus extends RawrCommand {
  static description = "Show machine-readable status for the managed RAWR HQ runtime";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HqStatus);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const status = await collectAndWriteHqStatus({ workspaceRoot });
    this.outputResult(this.ok(status), {
      flags: baseFlags,
      human: () => {
        this.log(formatHqStatusHuman(status));
      },
    });
  }
}
