import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { resolveNodeScratchPolicyInput } from "@rawr/dev-node/scratch-policy";
import { createDevClient } from "../../../lib/dev-binding";
import { devHumanRenderer, exitForPreflight } from "../../../lib/render";

export default class DevStackDrain extends RawrCommand {
  static description = "Plan or apply a Graphite stack drain";

  static flags = {
    ...RawrCommand.baseFlags,
    apply: Flags.boolean({ description: "Execute the planned stack drain", default: false }),
    "max-cycles": Flags.integer({ description: "Maximum merge-drain cycles", default: 20, min: 1 }),
    "sleep-seconds": Flags.integer({ description: "Seconds to wait between cycles", default: 8, min: 0 }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(DevStackDrain);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", { code: "WORKSPACE_ROOT_MISSING" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const data = await createDevClient({ workspaceRoot }).stack.drain({
      apply: Boolean(flags.apply) && !baseFlags.dryRun,
      maxCycles: Number(flags["max-cycles"]),
      sleepSeconds: Number(flags["sleep-seconds"]),
      scratchPolicy: await resolveNodeScratchPolicyInput({ workspaceRoot }),
    }, { context: { invocation: { traceId: "plugin-devops.stack.drain" } } });
    const result = this.ok(data);
    this.outputResult(result, { flags: baseFlags, human: devHumanRenderer(this) });
    const exitCode = exitForPreflight(data);
    if (exitCode !== 0) this.exit(exitCode);
  }
}
