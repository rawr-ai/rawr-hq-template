import { HabitatCommand } from "@habitat-ai/cli/command";
import { findWorkspaceRoot } from "@habitat-ai/rawr-core";
import { resolveNodeScratchPolicyInput } from "@habitat-ai/rawr-dev-node/scratch-policy";
import { Flags } from "@oclif/core";
import { createDevClient } from "../../../lib/dev-binding";
import { devHumanRenderer, exitForPreflight } from "../../../lib/render";

export default class DevRepoSyncUpstream extends HabitatCommand {
  static description = "Plan or apply a Graphite-aware upstream ref sync";

  static flags = {
    ...HabitatCommand.baseFlags,
    apply: Flags.boolean({ description: "Execute the planned upstream sync", default: false }),
    "upstream-ref": Flags.string({
      description: "Upstream ref. Defaults to git config rawr.upstreamRef, then origin/main.",
    }),
    "branch-prefix": Flags.string({
      description: "Prefix for generated sync branch",
      default: "chore/upstream-sync",
    }),
  } as const;

  async run() {
    const { flags } = await this.parse(DevRepoSyncUpstream);
    const baseFlags = HabitatCommand.extractBaseFlags(flags);
    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
        code: "WORKSPACE_ROOT_MISSING",
      });
      await this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const data = await createDevClient({ workspaceRoot }).repo.syncUpstream(
      {
        apply: Boolean(flags.apply) && !baseFlags.dryRun,
        upstreamRef: flags["upstream-ref"] ? String(flags["upstream-ref"]) : undefined,
        branchPrefix: String(flags["branch-prefix"]),
        scratchPolicy: await resolveNodeScratchPolicyInput({ workspaceRoot }),
      },
      { context: { invocation: { traceId: "plugin-devops.repo.sync-upstream" } } }
    );
    const result = this.ok(data);
    await this.outputResult(result, { flags: baseFlags, human: devHumanRenderer(this) });
    const exitCode = exitForPreflight(data);
    if (exitCode !== 0) this.exit(exitCode);
  }
}
