import fs from "node:fs/promises";
import path from "node:path";

export type FactoryWriteMode = "write" | "dry-run";

export type FactoryPlannedWrite = {
  path: string;
  action: "create" | "update" | "skip";
  reason?: string;
};

export function assertSafeSegment(input: string, label: string): string {
  const value = input.trim();
  if (!value) throw new Error(`${label} is required`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error(`${label} must be kebab-case (a-z0-9-) and start with a letter/number`);
  }
  return value;
}

export function toPascalCase(parts: string[]): string {
  return parts
    .flatMap((p) => p.split(/[-_\\s]+/g))
    .filter(Boolean)
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
    .join("");
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function planWriteFile(
  p: string,
  mode: FactoryWriteMode,
  contents: string,
): Promise<FactoryPlannedWrite> {
  if (await fileExists(p)) return { path: p, action: "skip", reason: "already exists" };
  if (mode === "dry-run") return { path: p, action: "create" };
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, contents, "utf8");
  return { path: p, action: "create" };
}

export function renderCommandSource(input: { topic: string; name: string; description: string }): string {
  const className = toPascalCase([input.topic, input.name]);
  return `import { RawrCommand } from "@rawr/core";

export default class ${className} extends RawrCommand {
  static description = ${JSON.stringify(input.description)};

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(${className});
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const result = this.ok({ command: "${input.topic} ${input.name}" });
    this.outputResult(result, { flags: baseFlags });
  }
}
`;
}

export function renderCommandTestSource(input: { topic: string; name: string }): string {
  const commandArgs = JSON.stringify([input.topic, input.name, "--json"]);
  return `import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("${input.topic} ${input.name}", () => {
  it("supports --json", () => {
    const proc = runRawr(${commandArgs});
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
  });
});
`;
}

export function renderWorkflowSource(input: { name: string; description: string }): string {
  const className = toPascalCase(["workflow", input.name]);
  return `import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { journalId, safePreview, writeSnippet, type JournalSnippet } from "@rawr/journal";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class ${className} extends RawrCommand {
  static description = ${JSON.stringify(input.description)};

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(${className});
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const planned = [{ name: "step-1", status: "planned" }] as const;

    if (baseFlags.dryRun) {
      const result = this.ok({ steps: planned });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const s of planned) this.log(\`[dry-run] \${s.name}\`);
        },
      });
      return;
    }

    const ok = true;
    const snippet: JournalSnippet = {
      id: \`\${journalId()}-workflow-${input.name}\`,
      ts: new Date().toISOString(),
      kind: "workflow",
      title: ${JSON.stringify(`workflow ${input.name}`)},
      preview: safePreview(\`ok=\${ok}\`),
      body: ${JSON.stringify(`workflow: ${input.name}\\nok: true`)},
      tags: ["workflow", ${JSON.stringify(input.name)}],
    };
    await writeSnippet(workspaceRoot, snippet);

    const result = this.ok({ ok });
    this.outputResult(result, { flags: baseFlags });
    if (!ok) this.exit(1);
  }
}
`;
}

export function renderWorkflowTestSource(input: { name: string }): string {
  const args = JSON.stringify(["workflow", input.name, "--json", "--dry-run"]);
  return `import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("workflow ${input.name}", () => {
  it("supports --json --dry-run", () => {
    const proc = runRawr(${args});
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.data.steps)).toBe(true);
  });
});
`;
}

export async function appendToolExport(
  toolsExportPath: string,
  tool: { command: string; description: string },
  mode: FactoryWriteMode,
): Promise<{ updated: boolean; planned: FactoryPlannedWrite | null }> {
  const raw = await fs.readFile(toolsExportPath, "utf8");
  if (raw.includes(`command: ${JSON.stringify(tool.command)}`)) {
    return { updated: false, planned: null };
  }

  const marker = "];";
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) throw new Error(`Unable to update tools export (missing '${marker}')`);

  const insertion = `  { command: ${JSON.stringify(tool.command)}, description: ${JSON.stringify(tool.description)} },\n`;
  const next = raw.slice(0, idx) + insertion + raw.slice(idx);

  if (mode === "dry-run") return { updated: true, planned: { path: toolsExportPath, action: "update" } };
  await fs.writeFile(toolsExportPath, next, "utf8");
  return { updated: true, planned: { path: toolsExportPath, action: "update" } };
}
