import { RawrCommand } from "@rawr/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";

export default class SecurityCheck extends RawrCommand {
  static description = "Run security checks";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SecurityCheck);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const security = await loadSecurityModule();
    const runSecurityCheck = security.runSecurityCheck;
    if (typeof runSecurityCheck !== "function") {
      const result = this.fail(missingSecurityFn("runSecurityCheck"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const report = await runSecurityCheck({
      cwd: process.cwd(),
      dryRun: baseFlags.dryRun,
      yes: baseFlags.yes,
    });

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
