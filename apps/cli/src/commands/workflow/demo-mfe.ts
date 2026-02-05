import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import path from "node:path";
import { journalId, safePreview, writeSnippet, type JournalSnippet } from "@rawr/journal";
import { recordArtifact, recordStep } from "../../lib/journal-context";
import { runStep, type StepResult } from "../../lib/subprocess";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type DemoStep = StepResult & { stdoutJson?: any };

export default class WorkflowDemoMfe extends RawrCommand {
  static description = "Enable + build + verify the micro-frontend demo plugin end-to-end";

  static flags = {
    ...RawrCommand.baseFlags,
    risk: Flags.string({
      description: "Risk tolerance passed to `hq plugins enable`",
      default: "off",
      options: ["strict", "balanced", "permissive", "off"],
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(WorkflowDemoMfe);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const risk = String(flags.risk);
    const pluginDir = "mfe-demo";
    const pluginId = "@rawr/plugin-mfe-demo";

    const verifyScript = [
      `import { createServerApp } from "./apps/server/src/app.ts";`,
      `import { registerRawrRoutes } from "./apps/server/src/rawr.ts";`,
      `import { getRepoState } from "@rawr/state";`,
      `const repoRoot = process.cwd();`,
      `const state = await getRepoState(repoRoot);`,
      `const enabled = new Set(state.plugins.enabled);`,
      `const app = registerRawrRoutes(createServerApp(), { repoRoot, enabledPluginIds: enabled });`,
      `const res = await app.handle(new Request("http://localhost/rawr/plugins/web/${pluginDir}"));`,
      `if (res.status !== 200) {`,
      `  const t = await res.text();`,
      `  console.error("verify failed:", res.status, t);`,
      `  process.exit(1);`,
      `}`,
      `console.log("ok");`,
    ].join("\n");

    const planned: DemoStep[] = [
      {
        name: "enable",
        cmd: "bun",
        args: ["run", "rawr", "--", "hq", "plugins", "enable", pluginDir, "--json", "--risk", risk],
        cwd: workspaceRoot,
        status: "planned",
      },
      {
        name: "build",
        cmd: "bunx",
        args: ["turbo", "run", "build", "--filter", pluginId],
        cwd: workspaceRoot,
        status: "planned",
      },
      {
        name: "verify",
        cmd: "bun",
        args: ["-e", verifyScript],
        cwd: workspaceRoot,
        status: "planned",
      },
    ];

    if (baseFlags.dryRun) {
      const result = this.ok({ steps: planned, pluginId, pluginDir });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const step of planned) this.log(`[dry-run] ${step.name}: ${step.cmd} ${step.args.join(" ")}`);
        },
      });
      return;
    }

    const steps: DemoStep[] = [];
    let ok = true;

    for (const step of planned) {
      const r = runStep({
        name: step.name,
        cmd: step.cmd,
        args: step.args,
        cwd: step.cwd,
        inheritStdio: !baseFlags.json,
      });

      const { proc, ...publicStep } = r;
      const stdoutJson = tryParseJson(proc.stdout);
      steps.push({ ...publicStep, stdoutJson });

      recordStep({
        name: publicStep.name,
        status: publicStep.exitCode === 0 ? "ok" : "fail",
        durationMs: publicStep.durationMs,
        exitCode: publicStep.exitCode,
      });

      if (publicStep.exitCode !== 0) ok = false;
    }

    recordArtifact(path.join(workspaceRoot, "plugins", pluginDir));

    await tryWriteDemoSnippet({ repoRoot: workspaceRoot, ok, pluginId });

    const result = this.ok({ ok, steps, pluginId, pluginDir });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`plugin: ${pluginId}`);
        this.log(`ok: ${ok ? "true" : "false"}`);
        if (ok) {
          this.log("next:");
          this.log("- run: rawr dev up");
          this.log("- visit: http://localhost:5173/mounts");
        }
      },
    });

    if (!ok) this.exit(1);
  }
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function tryWriteDemoSnippet(input: { repoRoot: string; ok: boolean; pluginId: string }): Promise<void> {
  const id = journalId();
  const ts = new Date().toISOString();
  const title = `workflow demo-mfe (${input.ok ? "ok" : "failed"})`;
  const body = [
    "workflow: demo-mfe",
    `ok: ${input.ok ? "true" : "false"}`,
    `plugin: ${input.pluginId}`,
    "",
    "how to view:",
    "- run: rawr dev up",
    "- visit: http://localhost:5173/mounts",
  ].join("\n");

  const snippet: JournalSnippet = {
    id: `${id}-workflow-demo-mfe`,
    ts,
    kind: "workflow",
    title,
    preview: safePreview(`ok=${input.ok} plugin=${input.pluginId}`),
    body,
    tags: ["workflow", "demo-mfe", input.pluginId],
  };

  try {
    await writeSnippet(input.repoRoot, snippet);
  } catch {
    // best-effort
  }
}
