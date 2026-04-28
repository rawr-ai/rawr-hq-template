// Required-path shim: the structural suite asserts this file exists and that
// it consumes the primitive resources port.
//
// Keep this as a thin re-export barrel only. Behavior is owned by narrower
// helper files, and policy is authored in the router.
import type { HqOpsResources } from "../../../shared/ports/resources";

export { securityReport, severityRank, sortFindings, summarize } from "./report-format";
export { maxFindingSeverity, toleranceToMaxSeverity } from "./report-risk";

import { readLatestSecurityReport, writeSecurityReport } from "./report-io";

export { readLatestSecurityReport };

export async function writeSecurityReportWithResources(
  resources: HqOpsResources,
  opts: Parameters<typeof writeSecurityReport>[1],
): Promise<Awaited<ReturnType<typeof writeSecurityReport>>> {
  return await writeSecurityReport(resources, opts);
}
