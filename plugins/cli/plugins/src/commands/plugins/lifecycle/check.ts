import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import {
  collectChangedFiles,
  evaluateLifecycleCompleteness,
  gitTrackedFiles,
  resolveTargetPath,
  verifySyncAndDrift,
} from "../../../lib/plugins-lifecycle/lifecycle";
import type { LifecycleType } from "../../../lib/plugins-lifecycle/types";
import { findWorkspaceRoot } from "../../../lib/workspace-plugins";

export default class PluginsLifecycleCheck extends RawrCommand {
  static description = "Validate plugin lifecycle completeness (artifacts/tests/docs/dependents + sync/drift verification)";

  static flags = {
    ...RawrCommand.baseFlags,
    target: Flags.string({
      description: "Target path or plugin id",
      required: true,
    }),
    type: Flags.string({
      description: "Change unit type",
      options: ["cli", "web", "agent", "skill", "workflow", "composed"],
      required: true,
    }),
    scope: Flags.string({
      description: "Lifecycle scope",
      options: ["plugin-system"],
      default: "plugin-system",
    }),
    base: Flags.string({
      description: "Optional git base ref for changed-file calculation",
    }),
    "changed-file": Flags.string({
      description: "Explicit changed file (repeatable); bypasses git diff discovery",
      multiple: true,
    }),
    "skip-sync-check": Flags.boolean({
      description: "Skip sync/drift verification commands",
      default: false,
      allowNo: true,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsLifecycleCheck);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
        code: "WORKSPACE_ROOT_MISSING",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const targetInput = String(flags.target);
    const targetAbs = await resolveTargetPath(workspaceRoot, targetInput);
    if (!targetAbs) {
      const result = this.fail("Unable to resolve lifecycle target path/id", {
        code: "TARGET_NOT_FOUND",
        details: { target: targetInput },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const changedFiles =
      ((flags as Record<string, unknown>)["changed-file"] as string[] | undefined)?.map((s) => s.trim()).filter(Boolean) ?? [];
    const derivedChanged =
      changedFiles.length > 0
        ? changedFiles
        : await collectChangedFiles(workspaceRoot, typeof flags.base === "string" ? flags.base : undefined);

    const repoFiles = await gitTrackedFiles(workspaceRoot);

    const sync = (flags as Record<string, unknown>)["skip-sync-check"]
      ? { syncVerified: true, driftVerified: true, driftDetected: false }
      : await verifySyncAndDrift(workspaceRoot);

    const lifecycle = await evaluateLifecycleCompleteness({
      workspaceRoot,
      targetInput,
      targetAbs,
      type: String(flags.type) as LifecycleType,
      changedFiles: derivedChanged,
      repoFiles,
      syncVerified: sync.syncVerified,
      driftVerified: sync.driftVerified,
      driftDetected: sync.driftDetected,
    });

    const payload = {
      changeUnitId: `${String(flags.type)}:${targetInput}`,
      scope: "plugin-system" as const,
      lifecycleCheck: lifecycle,
    };

    const result =
      lifecycle.status === "pass"
        ? this.ok(payload)
        : this.fail("Lifecycle check failed", {
            code: "LIFECYCLE_CHECK_FAILED",
            details: payload,
          });

    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`target: ${lifecycle.target.relPath}`);
        this.log(`type: ${lifecycle.target.type}`);
        this.log(`status: ${lifecycle.status.toUpperCase()}`);
        this.log(`sync_verified: ${String(lifecycle.syncVerified)}`);
        this.log(`drift_verified: ${String(lifecycle.driftVerified)} (drift_detected=${String(lifecycle.driftDetected)})`);
        if (lifecycle.missingTests.length > 0) this.log(`missing_tests: ${lifecycle.missingTests.join("; ")}`);
        if (lifecycle.missingDocs.length > 0) this.log(`missing_docs: ${lifecycle.missingDocs.join("; ")}`);
        if (lifecycle.missingDependents.length > 0) {
          this.log("missing_dependents:");
          for (const item of lifecycle.missingDependents) this.log(`- ${item}`);
        }
      },
    });

    if (!result.ok) this.exit(2);
  }
}
