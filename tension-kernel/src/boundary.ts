import { v4 as uuid } from "uuid";
import type { BoundaryProposal, Steward, SystemState, Tension } from "./types.js";
import type { Interface as ReadlineInterface } from "node:readline";

function prompt(rl: ReadlineInterface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * Present a boundary proposal to the human for approval.
 */
export async function presentBoundaryProposal(
  proposal: BoundaryProposal,
  state: SystemState,
  rl: ReadlineInterface
): Promise<boolean> {
  const proposer = state.stewards.get(proposal.proposingStewardId);
  const proposerName = proposer?.name ?? "unknown";

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║          BOUNDARY SPLIT PROPOSAL                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Proposed by: ${proposerName} (${proposer?.domain ?? "?"})`);
  console.log(`  New steward: "${proposal.newName}"`);
  console.log(`  New domain:  ${proposal.newDomain}`);
  console.log(`  Files to transfer: ${proposal.paths.join(", ")}`);
  console.log(`  Reason: ${proposal.reason}`);

  // Show relevant tension context
  if (proposal.tensionId) {
    const tension = state.tensions.get(proposal.tensionId);
    if (tension) {
      console.log(`\n  Triggered by tension: [${tension.type}] ${tension.description}`);
      const assessments = Array.from(tension.resonance.entries());
      if (assessments.length > 0) {
        console.log("  Resonance:");
        for (const [sid, r] of assessments) {
          const s = state.stewards.get(sid);
          console.log(`    ${s?.name ?? sid}: ${r.assessment} — ${r.reason}`);
        }
      }
    }
  }

  console.log("");
  const answer = await prompt(rl, "  Approve this boundary split? (y/n) > ");
  return answer.trim().toLowerCase() === "y";
}

/**
 * Execute a boundary spawn: create a new steward and transfer ownership.
 */
export function spawnSteward(
  proposal: BoundaryProposal,
  state: SystemState
): Steward {
  const parent = state.stewards.get(proposal.proposingStewardId);
  if (!parent) {
    throw new Error(`Parent steward ${proposal.proposingStewardId} not found`);
  }

  const newSteward: Steward = {
    id: uuid(),
    name: proposal.newName,
    domain: proposal.newDomain,
    ownedPaths: [...proposal.paths],
    ledger: [],
    parentId: parent.id,
    children: [],
    sessionHistory: [
      `Spawned from "${parent.name}" in round ${state.round}. Domain: ${proposal.newDomain}. Reason: ${proposal.reason}`,
    ],
  };

  // Remove transferred paths from parent
  parent.ownedPaths = parent.ownedPaths.filter(
    (p) => !proposal.paths.includes(p)
  );

  // Update parent-child relationship
  parent.children.push(newSteward.id);

  // Add to state
  state.stewards.set(newSteward.id, newSteward);
  state.maxStewards++;

  // Resolve the triggering tension if present
  if (proposal.tensionId) {
    const tension = state.tensions.get(proposal.tensionId);
    if (tension) {
      tension.resolvedBy = `boundary-spawn:${newSteward.id}`;
    }
    // Also check parent's ledger
    const ledgerTension = parent.ledger.find(
      (t) => t.id === proposal.tensionId
    );
    if (ledgerTension) {
      ledgerTension.resolvedBy = `boundary-spawn:${newSteward.id}`;
    }
  }

  console.log(
    `\n  ✓ Spawned steward "${newSteward.name}" (${newSteward.domain})`
  );
  console.log(`    Owns: [${newSteward.ownedPaths.join(", ")}]`);
  console.log(`    Parent "${parent.name}" now owns: [${parent.ownedPaths.join(", ")}]`);
  console.log(`    Total stewards: ${state.stewards.size}\n`);

  return newSteward;
}
