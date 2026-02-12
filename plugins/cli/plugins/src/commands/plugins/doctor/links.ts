import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { reconcileWorkspaceInstallLinks } from "../../../lib/install-reconcile";
import { assessInstallState } from "../../../lib/install-state";
import { findWorkspaceRoot } from "../../../lib/workspace-plugins";

function runtimePluginSnapshot(configPlugins: unknown): Array<{
  name: string;
  alias?: string;
  type?: string;
  root: string | null;
}> {
  const runtimePluginValues = configPlugins instanceof Map
    ? [...configPlugins.values()]
    : Array.isArray(configPlugins)
      ? configPlugins
      : [];

  return runtimePluginValues.map((plugin: any) => ({
    name: String(plugin.name ?? plugin.alias ?? ""),
    alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
    type: typeof plugin.type === "string" ? plugin.type : undefined,
    root: typeof plugin.root === "string" ? plugin.root : null,
  }));
}

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
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsDoctorLinks);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const repair = Boolean(flags.repair);
    const noFail = Boolean((flags as any)["no-fail"]);

    try {
      const workspaceRoot = await findWorkspaceRoot(process.cwd());
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
          code: "WORKSPACE_ROOT_MISSING",
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const runtimePlugins = runtimePluginSnapshot(this.config.plugins);
      let report = await assessInstallState({
        workspaceRoot,
        oclifDataDir: (this.config as any).dataDir as string | undefined,
        runtimePlugins,
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
        report = await assessInstallState({
          workspaceRoot,
          oclifDataDir: (this.config as any).dataDir as string | undefined,
          runtimePlugins,
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
            for (const action of report.actions) this.log(`- ${action.command} (${action.reason})`);
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
