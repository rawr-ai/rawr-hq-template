import { parseManagedRetireRequest } from "../domain/mode";
import type { ProviderOperationOutcome } from "../domain/outcome";
import { issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../domain/result";
import { planManagedRetire, type ProviderTargetPlan } from "../domain/state";
import type { ProviderTarget } from "../domain/target";
import type { ProviderUndoWriter } from "../ports/undo-writer";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderPriorProjectionReader,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";
import {
  aggregateOutcome,
  createRetireActionApplier,
  executePlans,
} from "./shared";

export interface ManagedRetireDependencies {
  readonly provider: ProviderTargetReader;
  readonly providerMutator: ProviderTargetMutator;
  readonly receipts: TargetReceiptReader;
  readonly receiptWriter: TargetReceiptWriter;
  readonly identities: TargetIdentityReader;
  readonly identityWriter: TargetIdentityWriter;
  readonly undoWriter: ProviderUndoWriter;
  readonly priorProjections: ProviderPriorProjectionReader;
  readonly marketplaceMaterializer: ProviderMarketplaceMaterializer;
}

export type ManagedRetireApplication = (input: unknown) => Promise<DeploymentResult<ProviderOperationOutcome>>;

export function createManagedRetire(
  dependencies: () => ManagedRetireDependencies,
): ManagedRetireApplication {
  return async (input) => {
    const parsed = parseManagedRetireRequest(input);
    if (!parsed.ok) return parsed;
    const ports = dependencies();
    const plans: ProviderTargetPlan[] = [];
    for (const target of parsed.value.targets) {
      const [receipt, identity] = await Promise.all([
        ports.receipts.read(target),
        ports.identities.read(target),
      ]);
      const authority = receipt.ok && receipt.value.kind === "present"
        ? receipt.value.receipt.body.managedMembers.find((member) => member.pluginId === parsed.value.pluginId)
          ?.artifactAuthority.contentAuthority
        : undefined;
      if (!receipt.ok || !identity.ok) {
        plans.push(blocked(target, [
          ...(receipt.ok ? [] : receipt.issues),
          ...(identity.ok ? [] : identity.issues),
        ]));
        continue;
      }
      if (authority === undefined) {
        plans.push(readOnly(target));
        continue;
      }
      const [capability, inventory] = await Promise.all([
        ports.provider.inspectCapabilities(target, authority),
        ports.provider.readInventory(target, authority),
      ]);
      const issues: ProviderDeploymentIssue[] = [
        ...(capability.ok ? [] : capability.issues),
        ...(inventory.ok ? [] : inventory.issues),
      ];
      if (capability.ok && (
        capability.value.provider !== target.provider
        || !capability.value.available.includes("managed-retire")
      )) {
        issues.push(issue("CAPABILITY_MISMATCH", "target.capabilities", "Provider does not support managed retirement"));
      }
      if (issues.length > 0 || !inventory.ok) {
        plans.push(blocked(target, issues));
      } else {
        plans.push(planManagedRetire(target, parsed.value.pluginId, inventory.value, receipt.value, identity.value));
      }
    }
    const outcomes = await executePlans(Object.freeze(plans), {
      provider: ports.provider,
      undoWriter: ports.undoWriter,
      applyAction: createRetireActionApplier(ports),
      priorProjections: ports.priorProjections,
      marketplaceMaterializer: ports.marketplaceMaterializer,
    });
    return success(aggregateOutcome(outcomes));
  };
}

function blocked(target: ProviderTarget, issues: readonly ProviderDeploymentIssue[]): ProviderTargetPlan {
  return Object.freeze({
    target,
    state: "blocked",
    projection: null,
    steps: Object.freeze([]),
    issues: Object.freeze([...issues]),
  });
}

function readOnly(target: ProviderTarget): ProviderTargetPlan {
  return Object.freeze({
    target,
    state: "read-only",
    projection: null,
    steps: Object.freeze([]),
    issues: Object.freeze([]),
  });
}
