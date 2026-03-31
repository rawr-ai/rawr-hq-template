import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { createHqOpsClient, createHqOpsInvocation } from "../../lib/hq-ops-client";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class SecurityCheck extends RawrCommand {
  static description = "Run security checks";

  static flags = {
    ...RawrCommand.baseFlags,
    staged: Flags.boolean({ description: "Scan staged changes only", default: false }),
    repo: Flags.boolean({ description: "Scan the whole repo (default)", default: false }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SecurityCheck);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const mode: "staged" | "repo" = flags.staged ? "staged" : "repo";

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    const report = await createHqOpsClient(workspaceRoot ?? process.cwd()).security.securityCheck(
      { mode },
      createHqOpsInvocation("cli.security.check"),
    );

    const result = this.ok({ report });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        const ok = Boolean((report as any)?.ok ?? true);
        this.log(ok ? "ok" : "failed");
      },
    });

    if ((report as any)?.ok === false) this.exit(1);
  }
}
