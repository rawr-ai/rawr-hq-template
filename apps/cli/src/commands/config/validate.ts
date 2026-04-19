import { RawrCommand } from "@rawr/core";
import { createHqOpsCallOptions, createHqOpsClient } from "../../lib/hq-ops-client";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type ValidationResult =
  | { ok: true; path: string | null; config: unknown | null; issues?: never }
  | { ok: false; path: string; config: unknown | null; issues: Array<{ path: string; message: string }> };

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

    const loaded = await createHqOpsClient(workspaceRoot).config.getWorkspaceConfig(
      {},
      createHqOpsCallOptions("cli.config.validate"),
    );

    if (!loaded.path) {
      const payload: ValidationResult = { ok: true, path: null, config: null };
      this.outputResult(this.ok(payload), {
        flags: baseFlags,
        human: () => {
          this.log("no rawr.config.ts found");
        },
      });
      return;
    }

    const loadError = loaded.error;
    if (loadError) {
      const issues =
        loadError.issues ?? [{ path: "(root)", message: loadError.cause ?? loadError.message }];
      const payload: ValidationResult = { ok: false, path: loaded.path, config: loaded.config, issues };
      const result = this.fail(loadError.message, { details: payload });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`${loadError.message}:`);
          for (const issue of issues) this.log(`- ${issue.path}: ${issue.message}`);
        },
      });
      this.exit(1);
      return;
    }

    const payload: ValidationResult = { ok: true, path: loaded.path, config: loaded.config };
    this.outputResult(this.ok(payload), {
      flags: baseFlags,
      human: () => {
        this.log("ok");
      },
    });
  }
}
