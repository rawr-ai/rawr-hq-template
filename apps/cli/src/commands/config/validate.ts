import { RawrCommand } from "@rawr/core";
import { rawrConfigPath, validateRawrConfig } from "@rawr/control-plane";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

type ValidationResult =
  | { ok: true; path: string | null; config: unknown | null; issues?: never }
  | { ok: false; path: string; config: unknown | null; issues: Array<{ path: string; message: string }> };

function pickConfigExport(mod: any): unknown {
  if (mod && typeof mod === "object" && "default" in mod) return (mod as any).default;
  return mod;
}

export default class ConfigValidate extends RawrCommand {
  static description = "Validate rawr.config.ts (if present)";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(ConfigValidate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const p = rawrConfigPath(workspaceRoot);
    try {
      const st = await fs.stat(p);
      if (!st.isFile()) throw new Error("not a file");
    } catch {
      const payload: ValidationResult = { ok: true, path: null, config: null };
      this.outputResult(this.ok(payload), {
        flags: baseFlags,
        human: () => {
          this.log("no rawr.config.ts found");
        },
      });
      return;
    }

    let exported: unknown = null;
    try {
      const href = `${pathToFileURL(p).href}?mtime=${encodeURIComponent(String(Date.now()))}`;
      const mod = (await import(href)) as any;
      exported = pickConfigExport(mod);
    } catch (err) {
      const result = this.fail("Failed to load rawr.config.ts", { details: { path: p, err: String(err) } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const validated = validateRawrConfig(exported);
    if (!validated.ok) {
      const payload: ValidationResult = { ok: false, path: p, config: exported, issues: validated.issues };
      const result = this.fail("rawr.config.ts is invalid", { details: payload });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log("rawr.config.ts is invalid:");
          for (const issue of validated.issues) this.log(`- ${issue.path}: ${issue.message}`);
        },
      });
      this.exit(1);
      return;
    }

    const payload: ValidationResult = { ok: true, path: p, config: validated.config };
    this.outputResult(this.ok(payload), {
      flags: baseFlags,
      human: () => {
        this.log("ok");
      },
    });
  }
}

