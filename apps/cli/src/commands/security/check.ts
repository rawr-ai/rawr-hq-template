import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";

export default class SecurityCheck extends RawrCommand {
  static description = "Run security checks";

  static flags = {
    ...RawrCommand.baseFlags,
    staged: Flags.boolean({ description: "Scan staged changes only", default: false }),
    repo: Flags.boolean({ description: "Scan the whole repo (default)", default: false }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SecurityCheck);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const mode: "staged" | "repo" = flags.staged ? "staged" : "repo";

    const security = await loadSecurityModule();
    const securityCheck = security.securityCheck;
    if (typeof securityCheck !== "function") {
      const result = this.fail(missingSecurityFn("securityCheck"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const report = await securityCheck({ mode });

    const result = this.ok({ report });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        const ok = Boolean((report as any)?.ok ?? true);
        this.log(ok ? "ok" : "failed");
      },
    });

    if ((report as any)?.ok === false) this.exit(1);
  }
}
