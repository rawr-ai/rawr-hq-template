import { RawrCommand, findWorkspaceRoot, type RawrResult } from "@rawr/core";
import type { UndoRunResult } from "@rawr/agent-config-sync/undo";
import {
  createAgentConfigSyncCallOptions,
  createAgentConfigSyncClient,
} from "../lib/agent-config-sync-client";

type UndoCommandData = {
  workspaceRoot: string;
  undo: UndoRunResult;
};

export default class Undo extends RawrCommand {
  static description = "Undo the last undo-capable RAWR command";

  static flags = {
    ...RawrCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(Undo);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workspaceRoot = await findWorkspaceRoot(process.cwd());

    if (!workspaceRoot) {
      this.outputResult(this.fail("Could not find a RAWR workspace root", {
        code: "WORKSPACE_ROOT_MISSING",
        details: { cwd: process.cwd() },
      }), { flags: baseFlags });
      process.exit(2);
      return;
    }

    const client = createAgentConfigSyncClient(workspaceRoot);
    const undo = await client.undo.runUndo(
      { dryRun: baseFlags.dryRun },
      createAgentConfigSyncCallOptions("cli.undo.run-undo"),
    );
    const result: RawrResult<UndoCommandData> = undo.ok
      ? this.ok({ workspaceRoot, undo })
      : this.fail(undo.message, {
        code: undo.code,
        details: {
          workspaceRoot,
          ...("details" in undo && undo.details !== undefined ? { service: undo.details } : {}),
        },
      });

    this.outputResult(result, {
      flags: baseFlags,
      human: (humanResult) => this.renderHuman(humanResult),
    });

    if (!undo.ok) process.exit(1);
  }

  private renderHuman(result: RawrResult<UndoCommandData>): void {
    if (!result.ok) {
      this.log(`error: ${result.error.message}`);
      if (result.error.code) this.log(`code: ${result.error.code}`);
      return;
    }

    if (!result.data || !result.data.undo.ok) {
      this.log("error: Undo did not return a successful result");
      return;
    }

    const undo = result.data.undo;
    this.log(`workspace: ${result.data.workspaceRoot}`);
    this.log(`capsule: ${undo.capsuleId}`);
    this.log(`provider: ${undo.provider}`);
    this.log(`dry-run: ${undo.dryRun ? "true" : "false"}`);
    this.log(
      [
        "summary:",
        `planned=${undo.summary.planned}`,
        `restored=${undo.summary.restored}`,
        `deleted=${undo.summary.deleted}`,
        `skippedMissing=${undo.summary.skippedMissing}`,
        `failed=${undo.summary.failed}`,
      ].join(" "),
    );
  }
}
