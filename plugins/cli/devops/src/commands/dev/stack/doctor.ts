import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { createDevClient } from "../../../lib/dev-binding";

export default class DevStackDoctor extends RawrCommand {
  static description = "Inspect Git, Graphite, and worktree state for stack work";

  static flags = {
    ...RawrCommand.baseFlags,
    "no-fail": Flags.boolean({ description: "Return zero even when stack requires attention", default: false }),
    branch: Flags.string({ description: "Branch to evaluate (defaults to current branch)" }),
    repo: Flags.string({ description: "Optional GitHub repo owner/name context" }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(DevStackDoctor);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const data = await createDevClient({ workspaceRoot }).stack.doctor({
      branch: flags.branch ? String(flags.branch) : undefined,
      repo: flags.repo ? String(flags.repo) : undefined,
    }, { context: { invocation: { traceId: "plugin-devops.stack.doctor" } } });
    const result = this.ok(data);
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`workspace: ${workspaceRoot}`);
        this.log(`status: ${data.report.status}`);
        for (const action of data.report.actions) this.log(`- ${action.command} (${action.reason})`);
      },
    });
    if (!Boolean(flags["no-fail"]) && data.report.status !== "HEALTHY") this.exit(1);
  }
}
