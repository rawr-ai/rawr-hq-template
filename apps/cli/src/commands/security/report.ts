import { RawrCommand } from "@rawr/core";
import { loadSecurityModule, missingSecurityFn } from "../../lib/security";
import fs from "node:fs/promises";
import path from "node:path";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

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
    const report =
      typeof getSecurityReport === "function"
        ? await getSecurityReport({ cwd: process.cwd() })
        : await readLatestReportFromDisk();
    const result = this.ok({ report });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(JSON.stringify(report, null, 2));
      },
    });
  }
}

async function readLatestReportFromDisk(): Promise<unknown> {
  const workspaceRoot = await findWorkspaceRoot(process.cwd());
  const root = workspaceRoot ?? process.cwd();
  const latestPath = path.join(root, ".rawr", "security", "latest.json");
  try {
    return JSON.parse(await fs.readFile(latestPath, "utf8"));
  } catch (err) {
    return { ok: true, note: missingSecurityFn("getSecurityReport"), error: String(err) };
  }
}
