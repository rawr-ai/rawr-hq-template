import { RawrCommand } from "@rawr/core";

import {
  inspectGlobalController,
  type GlobalDoctorData,
} from "../../lib/controller/global-diagnostics";
import { resolveExternalExtensionRuntime } from "../../lib/external-extensions/runtime";

export default class DoctorGlobal extends RawrCommand {
  static description = "Inspect selected controller and external extension provenance";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(DoctorGlobal);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const data = await inspectGlobalController({
      env: process.env,
      cwd: process.cwd(),
      oclifDataDir: this.config.dataDir,
      readExternalExtensions: () => resolveExternalExtensionRuntime(this.config).list(),
    });

    const result = data.healthy
      ? this.ok(data)
      : this.fail("Global controller provenance is unhealthy", {
          code: "GLOBAL_CONTROLLER_UNHEALTHY",
          details: data,
        });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => outputHumanDiagnostics(this, data),
    });
    if (!data.healthy) this.exit(1);
  }
}

function outputHumanDiagnostics(command: DoctorGlobal, data: GlobalDoctorData): void {
  command.log(data.healthy ? "Global controller provenance is healthy." : "Global controller provenance is unhealthy.");
  command.log(`- data root: ${data.dataRoot.path ?? "(unresolved)"}`);
  command.log(`- selector: ${data.selector.status}${data.selector.controllerDigest ? ` (${data.selector.controllerDigest})` : ""}`);
  command.log(`- launcher: ${data.launcher?.path ?? "(unavailable)"}`);
  command.log(`- release: ${data.release.status}${data.release.root ? ` (${data.release.root})` : ""}`);
  if (data.release.runtime.version && data.release.runtime.revision) {
    command.log(`- Bun: ${data.release.runtime.version} (${data.release.runtime.revision})`);
  }
  command.log(`- official members: ${data.release.officialMembers.length}`);
  command.log(`- external extensions: ${data.externalExtensions.active.length} active, ${data.externalExtensions.quarantined.length} quarantined`);
  if (data.issues.length > 0) {
    command.log("Issues:");
    for (const entry of data.issues) command.log(`- ${entry.code}: ${entry.message}`);
  }
}
