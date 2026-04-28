import type { FullSyncPolicyInput, FullSyncPolicyResult } from "../entities";

export function evaluateFullSyncPolicy(input: FullSyncPolicyInput): FullSyncPolicyResult {
  const partialReasons: string[] = [];
  if (input.agent !== "all") partialReasons.push(`agent=${input.agent}`);
  if (input.scope !== "all") partialReasons.push(`scope=${input.scope}`);
  if (!input.coworkEnabled) partialReasons.push("cowork disabled");
  if (!input.claudeInstallEnabled) partialReasons.push("claude install disabled");
  if (input.claudeInstallEnabled && !input.claudeEnableEnabled) {
    partialReasons.push("claude enable disabled");
  }
  if (!input.installReconcileEnabled) partialReasons.push("install reconcile disabled");
  if (!input.retireOrphansEnabled) partialReasons.push("stale managed plugin retirement disabled");
  if (!input.force) partialReasons.push("force disabled");
  if (!input.gc) partialReasons.push("gc disabled");

  const allowed = partialReasons.length === 0 || input.allowPartial;
  return {
    allowed,
    partialReasons,
    canonical: "rawr plugins sync all",
    failure: allowed
      ? undefined
      : {
          code: "PARTIAL_MODE_REQUIRES_ALLOW_PARTIAL",
          message: "Partial sync mode is blocked by default; re-run with --allow-partial for advanced exceptions",
        },
  };
}
