import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Args } from "@oclif/core";
import { rawrGlobalConfigPath, validateRawrConfig } from "@rawr/control-plane";
import { RawrCommand } from "@rawr/core";

function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function readGlobalConfig(): Promise<any> {
  const p = rawrGlobalConfigPath();
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as any;
  } catch {
    return { version: 1 };
  }
}

async function writeGlobalConfig(cfg: any): Promise<void> {
  const p = rawrGlobalConfigPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
}

export default class PluginsSyncSourcesAdd extends RawrCommand {
  static description = "Add an explicit sync source path to ~/.rawr/config.json";

  static args = {
    path: Args.string({ description: "Path to a plugin root (or content root)", required: true }),
  };

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(PluginsSyncSourcesAdd);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const input = String(args.path);
    const resolved = path.resolve(process.cwd(), expandTilde(input));

    const cfg = await readGlobalConfig();
    const validated = validateRawrConfig(cfg);
    if (!validated.ok) {
      const result = this.fail("Invalid ~/.rawr/config.json", { details: { issues: validated.issues, path: rawrGlobalConfigPath() } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const next: any = validated.config;
    next.sync = next.sync ?? {};
    next.sync.sources = next.sync.sources ?? {};

    const existing: string[] = Array.isArray(next.sync.sources.paths) ? next.sync.sources.paths : [];
    const set = new Set(existing);
    set.add(resolved);
    next.sync.sources.paths = [...set];

    await writeGlobalConfig(next);

    const result = this.ok({ path: rawrGlobalConfigPath(), added: resolved, sources: next.sync.sources.paths });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`added: ${resolved}`);
      },
    });
  }
}
