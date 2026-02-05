import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import path from "node:path";
import { journalId, safePreview, writeSnippet, type JournalSnippet } from "@rawr/journal";
import { recordArtifact, recordStep } from "../../lib/journal-context";
import { resolveCliEntrypoint, runStep, type StepResult } from "../../lib/subprocess";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type HardenStep = StepResult & { stdoutJson?: any };

export default class WorkflowHarden extends RawrCommand {
  static description =
    "Run a local-first hardening workflow (snapshot + security check + posture) and emit an atomic journal snippet";

  static flags = {
    ...RawrCommand.baseFlags,
    mode: Flags.string({
      description: "Security scan mode",
      options: ["staged", "repo"],
      default: "repo",
    }),
    "include-check": Flags.boolean({
      description: "Also run `routine check` after posture generation",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(WorkflowHarden);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const mode = String(flags.mode) as "staged" | "repo";
    const includeCheck = Boolean((flags as Record<string, unknown>)["include-check"]);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const tsDir = safeTimestamp();
    const snapshotOutDir = path.join(workspaceRoot, ".rawr", "routines", tsDir);
    const postureOutDir = path.join(workspaceRoot, ".rawr", "security", "posture", tsDir);

    const entrypoint = resolveCliEntrypoint();

    const planned: HardenStep[] = [
      {
        name: "snapshot",
        cmd: "bun",
        args: [entrypoint, "routine", "snapshot", "--json", "--out", snapshotOutDir],
        cwd: workspaceRoot,
        status: "planned",
      },
      {
        name: "security",
        cmd: "bun",
        args: [
          entrypoint,
          "security",
          "check",
          "--json",
          ...(mode === "staged" ? ["--staged"] : ["--repo"]),
        ],
        cwd: workspaceRoot,
        status: "planned",
      },
      {
        name: "posture",
        cmd: "bun",
        args: [entrypoint, "security", "posture", "--json", "--out", postureOutDir],
        cwd: workspaceRoot,
        status: "planned",
      },
      {
        name: "routine-check",
        cmd: "bun",
        args: [entrypoint, "routine", "check", "--json", "--mode", mode],
        cwd: workspaceRoot,
        status: includeCheck ? "planned" : "skipped",
      },
    ];

    if (baseFlags.dryRun) {
      const result = this.ok({ steps: planned, snapshotOutDir, postureOutDir });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const step of planned) this.log(`[dry-run] ${step.name}: ${step.cmd} ${step.args.join(" ")}`);
        },
      });
      return;
    }

    const steps: HardenStep[] = [];
    let overallOk = true;
    let postureOk = true;

    for (const step of planned) {
      if (step.status === "skipped") {
        steps.push(step);
        recordStep({ name: step.name, status: "skip" });
        continue;
      }

      const r = runStep({
        name: step.name,
        cmd: step.cmd,
        args: step.args,
        cwd: step.cwd,
        inheritStdio: !baseFlags.json,
      });

      const { proc, ...publicStep } = r;
      const stdoutJson = tryParseJson(proc.stdout);
      const withJson: HardenStep = { ...publicStep, stdoutJson };
      steps.push(withJson);

      recordStep({
        name: publicStep.name,
        status: publicStep.exitCode === 0 ? "ok" : "fail",
        durationMs: publicStep.durationMs,
        exitCode: publicStep.exitCode,
      });

      if (publicStep.name === "snapshot") recordArtifact(path.join(snapshotOutDir, "snapshot.json"));
      if (publicStep.name === "posture") recordArtifact(path.join(postureOutDir, "latest.json"));

      if (publicStep.name === "posture") {
        postureOk = Boolean(stdoutJson?.data?.posture?.ok ?? stdoutJson?.posture?.ok ?? true);
      }

      if (publicStep.exitCode !== 0) overallOk = false;
    }

    const ok = overallOk && postureOk;
    await tryWriteWorkflowSnippet({
      repoRoot: workspaceRoot,
      ok,
      mode,
      snapshotOutDir,
      postureOutDir,
      steps,
    });

    const result = this.ok({ ok, postureOk, steps, snapshotOutDir, postureOutDir });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        for (const step of steps) {
          const dur = typeof step.durationMs === "number" ? ` (${step.durationMs}ms)` : "";
          this.log(`${step.status}: ${step.name}${dur}`);
        }
        this.log(`ok: ${ok ? "true" : "false"}`);
      },
    });

    if (!ok) this.exit(1);
  }
}

function safeTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function tryWriteWorkflowSnippet(input: {
  repoRoot: string;
  ok: boolean;
  mode: "staged" | "repo";
  snapshotOutDir: string;
  postureOutDir: string;
  steps: HardenStep[];
}): Promise<void> {
  const id = journalId();
  const ts = new Date().toISOString();
  const title = `workflow harden (${input.ok ? "ok" : "failed"})`;

  const bodyLines: string[] = [];
  bodyLines.push(`workflow: harden`);
  bodyLines.push(`ok: ${input.ok ? "true" : "false"}`);
  bodyLines.push(`mode: ${input.mode}`);
  bodyLines.push(`snapshot: ${input.snapshotOutDir}`);
  bodyLines.push(`posture: ${input.postureOutDir}`);
  bodyLines.push("");
  bodyLines.push("steps:");
  for (const s of input.steps) {
    const code = typeof s.exitCode === "number" ? ` exit=${s.exitCode}` : "";
    bodyLines.push(`- ${s.name}: ${s.status}${code}`);
  }

  const snippet: JournalSnippet = {
    id: `${id}-workflow-harden`,
    ts,
    kind: "workflow",
    title,
    preview: safePreview(`ok=${input.ok} mode=${input.mode} steps=${input.steps.length}`),
    body: bodyLines.join("\n"),
    tags: ["workflow", "harden", input.mode],
  };

  try {
    await writeSnippet(input.repoRoot, snippet);
  } catch {
    // best-effort
  }
}

