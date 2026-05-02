import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import {
  assessPluginInstallState,
  pluginInstallActionCommandText,
  reconcileWorkspaceInstallLinks,
  runtimePluginSnapshot,
} from "../../../lib/plugin-install-service";
import { resolveSourceWorkspaceSelection } from "../../../lib/agent-config-sync";
import { loadLayeredRawrConfigForCwd } from "../../../lib/layered-config";

/**
 * Diagnoses and optionally repairs local oclif command-plugin link drift.
 *
 * HQ Ops owns expected-link policy; this command observes the local plugin
 * manager and executes approved repair actions.
 */
export default class PluginsDoctorLinks extends RawrCommand {
  static description = "Diagnose plugin install/link drift and optionally repair stale or legacy link state";

  static flags = {
    ...RawrCommand.baseFlags,
    repair: Flags.boolean({
      description: "Attempt automatic install/link repair",
      default: false,
    }),
    "no-fail": Flags.boolean({
      description: "Return zero exit code even when drift remains",
      default: false,
    }),
    "source-workspace": Flags.string({
      description: "RAWR workspace to use as the install/link source of truth",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsDoctorLinks);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const repair = Boolean(flags.repair);
    const noFail = Boolean((flags as any)["no-fail"]);

    try {
      const cwd = process.cwd();
      const invocationLayered = await loadLayeredRawrConfigForCwd(cwd);
      const sourceWorkspace = await resolveSourceWorkspaceSelection({
        cwd,
        sourceWorkspaceFlag: (flags as any)["source-workspace"] as string | undefined,
        config: invocationLayered.config ?? undefined,
        configWorkspacePath: invocationLayered.workspacePath,
        configGlobalPath: invocationLayered.globalPath,
      });
      const workspaceRoot = sourceWorkspace.sourceWorkspaceRoot;

      const runtimePlugins = runtimePluginSnapshot(this.config.plugins);
      let report = await assessPluginInstallState({
        workspaceRoot,
        oclifDataDir: (this.config as any).dataDir as string | undefined,
        runtimePlugins,
        traceId: "plugin-plugins.plugin-install.doctor-assess",
      });

      const repairResult = repair
        ? await reconcileWorkspaceInstallLinks({
            workspaceRoot,
            dryRun: baseFlags.dryRun,
            enabled: true,
            oclifDataDir: (this.config as any).dataDir as string | undefined,
            runtimePlugins,
          })
        : null;

      if (repairResult && repairResult.action !== "planned") {
        report = await assessPluginInstallState({
          workspaceRoot,
          oclifDataDir: (this.config as any).dataDir as string | undefined,
          runtimePlugins,
          traceId: "plugin-plugins.plugin-install.doctor-assess-after-repair",
        });
      }

      const result = this.ok({
        workspaceRoot,
        status: report.status,
        inSync: report.inSync,
        report,
        repair: {
          requested: repair,
          result: repairResult ?? { action: "skipped", reason: "not requested" },
        },
        actions: report.actions,
      });

      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`status: ${report.status}`);
          this.log(`issues: ${report.summary.issueCount}`);
          if (repair) this.log(`repair: ${repairResult?.action ?? "skipped"}`);
          if (report.actions.length > 0) {
            this.log("actions:");
            for (const action of report.actions) this.log(`- ${pluginInstallActionCommandText(action)} (${action.reason})`);
          }
        },
      });

      if (!noFail && !report.inSync) {
        this.exit(1);
        return;
      }
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "PLUGINS_DOCTOR_LINKS_FAILED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
