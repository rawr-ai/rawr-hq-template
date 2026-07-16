import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { resolveNodeScratchPolicyInput } from "@rawr/dev-node/scratch-policy";
import { createDevClient } from "../../../lib/dev-binding";
import { devHumanRenderer, exitForPreflight } from "../../../lib/render";

export default class DevWorktreeCleanup extends RawrCommand {
  static description = "Plan or apply strict-prefix worktree cleanup";

  static flags = {
    ...RawrCommand.baseFlags,
    apply: Flags.boolean({ description: "Execute planned worktree removals", default: false }),
    prefix: Flags.string({ description: "Required worktree basename prefix", required: true }),
    "merged-only": Flags.boolean({ description: "Only remove branches already merged into trunk", default: true, allowNo: true }),
    trunk: Flags.string({ description: "Trunk branch used for merged checks", default: "main" }),
    "pin-path": Flags.string({ description: "Worktree path to exclude (repeatable)", multiple: true }),
    "pin-branch": Flags.string({ description: "Branch to exclude (repeatable)", multiple: true }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(DevWorktreeCleanup);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const data = await createDevClient({ workspaceRoot }).worktree.cleanup({
      apply: Boolean(flags.apply) && !baseFlags.dryRun,
      prefix: String(flags.prefix),
      mergedOnly: Boolean(flags["merged-only"]),
      trunk: String(flags.trunk),
      pinnedPaths: (flags["pin-path"] as string[] | undefined) ?? [],
      pinnedBranches: (flags["pin-branch"] as string[] | undefined) ?? [],
      scratchPolicy: await resolveNodeScratchPolicyInput({ workspaceRoot }),
    }, { context: { invocation: { traceId: "plugin-devops.worktree.cleanup" } } });
    const result = this.ok(data);
    this.outputResult(result, { flags: baseFlags, human: devHumanRenderer(this) });
    const exitCode = exitForPreflight(data);
    if (exitCode !== 0) this.exit(exitCode);
  }
}
