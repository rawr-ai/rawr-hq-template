import { RawrCommand } from "@rawr/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";

export default class SecurityReport extends RawrCommand {
  static description = "Show the last security report";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SecurityReport);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const security = await loadSecurityModule();
    const getSecurityReport = security.getSecurityReport;
    if (typeof getSecurityReport !== "function") {
      const result = this.fail(missingSecurityFn("getSecurityReport"), { code: "NOT_IMPLEMENTED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const report = await getSecurityReport({ cwd: process.cwd() });
    const result = this.ok({ report });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(JSON.stringify(report, null, 2));
      },
    });
  }
}
