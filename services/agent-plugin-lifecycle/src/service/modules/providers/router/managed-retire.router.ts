import { parseManagedRetireRequest } from "../model/dto/mode";
import { issue, success, type DeploymentResult, type ProviderDeploymentIssue } from "../model/errors/deployment-result";
import { planManagedRetire, type ProviderTargetPlan } from "../model/policy/state-machine";
import type { ProviderTarget } from "../model/dto/provider-target";
import { module } from "../module";
import type { ProviderTargetMutator, ProviderTargetReader } from "../ports/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderPriorProjectionReader,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "../ports/state";
import type { ProviderUndoWriter } from "../ports/undo-writer";
import {
  aggregateOutcome,
  createRetireActionApplier,
  executePlans,
} from "./operation-support";
import { providerOperationResult } from "./procedure-result";

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

export const managedRetire = module.managedRetire.handler(
  async ({ context, input }) => providerOperationResult(
    executeManagedRetire(input, context.providers),
  ),
);

async function executeManagedRetire(
  input: unknown,
  ports: ManagedRetireDependencies,
): Promise<DeploymentResult<import("../model/dto/outcome").ProviderOperationOutcome>> {
    const parsed = parseManagedRetireRequest(input);
    if (!parsed.ok) return parsed;
    const plans: ProviderTargetPlan[] = [];
    for (const target of parsed.value.targets) {
      const [receipt, identity] = await Promise.all([
        ports.receipts.read(target),
        ports.identities.read(target),
      ]);
      const inspectionAuthority = receipt.ok && receipt.value.kind === "present"
        ? receipt.value.receipt.body.managedMembers.find((member) => member.pluginId === parsed.value.pluginId)
          ?.artifactAuthority.contentAuthority
          ?? receipt.value.receipt.body.marketplace.marketplaceIdentity
        : undefined;
      const [capability, inventory] = await Promise.all([
        ports.provider.inspectCapabilities(target, inspectionAuthority),
        ports.provider.readInventory(target, inspectionAuthority),
      ]);
      const issues: ProviderDeploymentIssue[] = [
        ...(receipt.ok ? [] : receipt.issues),
        ...(identity.ok ? [] : identity.issues),
        ...(capability.ok ? [] : capability.issues),
        ...(inventory.ok ? [] : inventory.issues),
      ];
      if (capability.ok && (
        capability.value.provider !== target.provider
        || !capability.value.available.includes("managed-retire")
      )) {
        issues.push(issue("CAPABILITY_MISMATCH", "target.capabilities", "Provider does not support managed retirement"));
      }
      if (issues.length > 0 || !receipt.ok || !identity.ok || !inventory.ok) {
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
