import { RawrCommand, type RawrResult } from "@rawr/core";

type DevResultProjection = {
  preflight?: { ok: boolean; issues: Array<{ severity: string; code: string; message: string }> };
  execution?: { ok: boolean; issues: Array<{ severity: string; code: string; message: string }> };
  action?: string;
};

export function devHumanRenderer<T extends DevResultProjection>(
  command: RawrCommand
): (result: RawrResult<T>) => void {
  return (output) => {
    if (!output.ok) {
      command.log(`error: ${output.error.message}`);
      return;
    }
    const data = output.data;
    if (data?.action) command.log(`action: ${data.action}`);
    if (data?.preflight) {
      command.log(`preflight: ${data.preflight.ok ? "ok" : "failed"}`);
      for (const issue of data.preflight.issues) {
        command.log(`${issue.severity}: ${issue.code} ${issue.message}`);
      }
    }
    if (data?.execution) {
      command.log(`execution: ${data.execution.ok ? "ok" : "failed"}`);
      for (const issue of data.execution.issues) {
        command.log(`${issue.severity}: ${issue.code} ${issue.message}`);
      }
    }
  };
}

export function exitForPreflight(data: {
  preflight?: { ok: boolean };
  execution?: { ok: boolean };
}): number {
  if (data.preflight && !data.preflight.ok) return 1;
  if (data.execution && !data.execution.ok) return 1;
  return 0;
}
