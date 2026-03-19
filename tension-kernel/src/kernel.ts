import { v4 as uuid } from "uuid";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  SystemState,
  Steward,
  Tension,
  RoundSummary,
  TokenUsage,
  BoundaryProposal,
} from "./types.js";
import { runStewardCycle } from "./steward.js";
import {
  findAdjacentStewards,
  assessTension,
  evaluateTension,
} from "./tension.js";
import { presentBoundaryProposal, spawnSteward } from "./boundary.js";
import { computeCost, getCumulativeUsage } from "./llm.js";
import type { Interface as ReadlineInterface } from "node:readline";

const WORKSPACE_DIR = path.resolve(process.cwd(), "workspace");
const COST_WARNING_PER_ROUND = 0.5;

export class TensionKernel {
  state: SystemState;
  private rl: ReadlineInterface | null = null;

  constructor(objective: string) {
    const rootSteward: Steward = {
      id: uuid(),
      name: "root",
      domain: "everything — full scope of the objective",
      ownedPaths: [],
      ledger: [],
      parentId: null,
      children: [],
      sessionHistory: [],
    };

    this.state = {
      objective,
      stewards: new Map([[rootSteward.id, rootSteward]]),
      tensions: new Map(),
      actions: [],
      files: new Map(),
      maxStewards: 1,
      round: 0,
    };

    // Ensure workspace directory exists
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
  }

  setReadline(rl: ReadlineInterface): void {
    this.rl = rl;
  }

  async runRound(): Promise<RoundSummary> {
    this.state.round++;
    const round = this.state.round;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ROUND ${round}`);
    console.log(`${"=".repeat(60)}`);

    const roundUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    const stewardResults: RoundSummary["stewardResults"] = [];
    const allNewTensions: Tension[] = [];
    const allBoundaryProposals: BoundaryProposal[] = [];

    // Run each steward's work cycle sequentially
    const stewardList = Array.from(this.state.stewards.values());
    for (const steward of stewardList) {
      const result = await runStewardCycle(steward, this.state);

      roundUsage.inputTokens += result.usage.inputTokens;
      roundUsage.outputTokens += result.usage.outputTokens;

      // Record actions
      this.state.actions.push(...result.actions);

      // Collect tensions and proposals
      allNewTensions.push(...result.newTensions);
      allBoundaryProposals.push(...result.boundaryProposals);

      stewardResults.push({
        stewardId: steward.id,
        stewardName: steward.name,
        actionCount: result.actions.length,
        done: result.done,
      });
    }

    // Write all files to disk
    this.syncFilesToDisk();

    // Process tensions: propagate, assess, evaluate
    const escalations: Tension[] = [];
    const autoProposals: BoundaryProposal[] = [];

    for (const tension of allNewTensions) {
      this.state.tensions.set(tension.id, tension);

      // Find adjacent stewards and run assessment
      const adjacent = findAdjacentStewards(
        tension,
        this.state.stewards,
        tension.stewardId
      );

      if (adjacent.length > 0) {
        console.log(
          `\n  [propagation] Assessing tension "${tension.description.slice(0, 60)}..." with ${adjacent.length} adjacent steward(s)`
        );
        const assessResult = await assessTension(
          tension,
          adjacent,
          this.state.files
        );
        roundUsage.inputTokens += assessResult.usage.inputTokens;
        roundUsage.outputTokens += assessResult.usage.outputTokens;

        // Process any new tensions from assessors
        for (const newT of assessResult.newTensions) {
          this.state.tensions.set(newT.id, newT);
          const assessor = this.state.stewards.get(newT.stewardId);
          if (assessor) {
            assessor.ledger.push(newT);
          }
        }
      }

      // Evaluate thresholds
      const outcome = evaluateTension(tension);
      if (outcome === "propose-boundary") {
        console.log(
          `  [tension] Cohesion threshold crossed — auto-proposing boundary for: "${tension.description.slice(0, 60)}..."`
        );
        const sourceSteward = this.state.stewards.get(tension.stewardId);
        if (sourceSteward) {
          autoProposals.push({
            proposingStewardId: tension.stewardId,
            newDomain: tension.description,
            newName: `steward-${this.state.stewards.size + 1}`,
            paths: [],
            reason: `Auto-proposed due to cohesion magnitude ${tension.magnitude.toFixed(2)} on tension: ${tension.description}`,
            tensionId: tension.id,
          });
        }
      } else if (outcome === "escalate") {
        console.log(
          `  [tension] ESCALATION — tension with disagreement: "${tension.description.slice(0, 80)}..."`
        );
        escalations.push(tension);
      }
    }

    // Combine all boundary proposals
    const allProposals = [...allBoundaryProposals, ...autoProposals];
    let boundariesApproved = 0;

    // Process boundary proposals
    if (allProposals.length > 0 && this.rl) {
      for (const proposal of allProposals) {
        const approved = await presentBoundaryProposal(
          proposal,
          this.state,
          this.rl
        );
        if (approved) {
          spawnSteward(proposal, this.state);
          boundariesApproved++;
        } else {
          console.log("  ✗ Boundary proposal rejected.");
          // Mark tension as human-reviewed if it has one
          if (proposal.tensionId) {
            const t = this.state.tensions.get(proposal.tensionId);
            if (t) {
              t.resolvedBy = "human-reviewed:rejected";
            }
          }
        }
      }
    }

    // Show escalations
    if (escalations.length > 0) {
      console.log("\n  ⚠ ESCALATED TENSIONS (disagreement detected):");
      for (const t of escalations) {
        console.log(`    [${t.type}] ${t.description}`);
        for (const [sid, r] of t.resonance) {
          const s = this.state.stewards.get(sid);
          console.log(`      ${s?.name ?? sid}: ${r.assessment} — ${r.reason}`);
        }
      }
    }

    // Cost check
    const roundCost = computeCost(roundUsage);
    if (roundCost > COST_WARNING_PER_ROUND) {
      console.log(
        `\n  ⚠ WARNING: Round cost $${roundCost.toFixed(4)} exceeds $${COST_WARNING_PER_ROUND} threshold!`
      );
    }

    const summary: RoundSummary = {
      round,
      stewardResults,
      newTensions: allNewTensions,
      boundariesProposed: allProposals.length,
      boundariesApproved,
      escalations,
      usage: roundUsage,
      cost: roundCost,
    };

    this.printRoundSummary(summary);

    return summary;
  }

  private syncFilesToDisk(): void {
    for (const [filePath, content] of this.state.files) {
      const fullPath = path.resolve(process.cwd(), filePath);
      // Safety: must be under workspace
      if (!fullPath.startsWith(WORKSPACE_DIR)) {
        console.log(`  [kernel] BLOCKED disk write outside workspace: ${filePath}`);
        continue;
      }
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, "utf-8");
    }
  }

  private printRoundSummary(summary: RoundSummary): void {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`  Round ${summary.round} Summary`);
    console.log(`${"─".repeat(60)}`);
    console.log(`  Stewards active: ${summary.stewardResults.length}`);
    for (const sr of summary.stewardResults) {
      console.log(
        `    ${sr.stewardName}: ${sr.actionCount} actions${sr.done ? " (DONE)" : ""}`
      );
    }
    console.log(`  Files in workspace: ${this.state.files.size}`);
    console.log(
      `  Tensions: ${summary.newTensions.length} new, ${this.getUnresolvedTensionCount()} unresolved total`
    );
    console.log(
      `  Boundaries: ${summary.boundariesProposed} proposed, ${summary.boundariesApproved} approved`
    );
    console.log(
      `  Round cost: $${summary.cost.toFixed(4)} (${summary.usage.inputTokens} in / ${summary.usage.outputTokens} out)`
    );
    const cumulative = getCumulativeUsage();
    console.log(`  Cumulative cost: $${cumulative.cost.toFixed(4)}`);

    if (summary.stewardResults.every((sr) => sr.done)) {
      console.log(
        `\n  ★ All stewards report DONE. Review ./workspace/ and type 'done' or provide feedback.`
      );
    }
  }

  private getUnresolvedTensionCount(): number {
    let count = 0;
    for (const t of this.state.tensions.values()) {
      if (!t.resolvedBy) count++;
    }
    return count;
  }

  getStatus(): string {
    const lines: string[] = [
      `\n${"═".repeat(60)}`,
      "  SYSTEM STATUS",
      `${"═".repeat(60)}`,
      `  Objective: ${this.state.objective}`,
      `  Round: ${this.state.round}`,
      `  Stewards: ${this.state.stewards.size} (max: ${this.state.maxStewards})`,
      `  Files: ${this.state.files.size}`,
      `  Total tensions: ${this.state.tensions.size}`,
      `  Unresolved: ${this.getUnresolvedTensionCount()}`,
      "",
      "  TENSION MAP:",
    ];

    for (const t of this.state.tensions.values()) {
      const source = this.state.stewards.get(t.stewardId);
      const status = t.resolvedBy ? `✓ ${t.resolvedBy}` : "OPEN";
      lines.push(
        `    [${t.type}] (${t.polarity}, mag=${t.magnitude.toFixed(2)}) ${status}`
      );
      lines.push(`      From: ${source?.name ?? t.stewardId}`);
      lines.push(`      ${t.description}`);
      if (t.resonance.size > 0) {
        for (const [sid, r] of t.resonance) {
          const s = this.state.stewards.get(sid);
          lines.push(
            `        ${s?.name ?? sid}: ${r.assessment} (w=${r.weight}) — ${r.reason}`
          );
        }
      }
    }

    const cumulative = getCumulativeUsage();
    lines.push("");
    lines.push(`  Total cost: $${cumulative.cost.toFixed(4)}`);
    lines.push(`${"═".repeat(60)}`);

    return lines.join("\n");
  }

  getTree(): string {
    const lines: string[] = [
      `\n${"═".repeat(60)}`,
      "  STEWARD HIERARCHY",
      `${"═".repeat(60)}`,
    ];

    const roots = Array.from(this.state.stewards.values()).filter(
      (s) => s.parentId === null
    );

    for (const root of roots) {
      this.printStewardTree(root, lines, 0);
    }

    lines.push(`${"═".repeat(60)}`);
    return lines.join("\n");
  }

  private printStewardTree(
    steward: Steward,
    lines: string[],
    depth: number
  ): void {
    const indent = "  " + "  ".repeat(depth);
    const prefix = depth === 0 ? "◉" : "├─";
    const unresolvedCount = steward.ledger.filter(
      (t) => !t.resolvedBy
    ).length;

    lines.push(
      `${indent}${prefix} ${steward.name} (${steward.domain})`
    );
    lines.push(
      `${indent}   Files: [${steward.ownedPaths.join(", ")}]`
    );
    lines.push(
      `${indent}   Tensions: ${steward.ledger.length} total, ${unresolvedCount} unresolved`
    );

    for (const childId of steward.children) {
      const child = this.state.stewards.get(childId);
      if (child) {
        this.printStewardTree(child, lines, depth + 1);
      }
    }
  }

  getFinalReport(): string {
    const lines: string[] = [
      `\n${"═".repeat(60)}`,
      "  FINAL REPORT — TENSION KERNEL POC",
      `${"═".repeat(60)}`,
      "",
      `  Objective: ${this.state.objective}`,
      `  Rounds completed: ${this.state.round}`,
      `  Total stewards: ${this.state.stewards.size}`,
      `  Total files: ${this.state.files.size}`,
      `  Total tensions logged: ${this.state.tensions.size}`,
      `  Unresolved tensions: ${this.getUnresolvedTensionCount()}`,
      `  Total actions: ${this.state.actions.length}`,
    ];

    const cumulative = getCumulativeUsage();
    lines.push(`  Total cost: $${cumulative.cost.toFixed(4)}`);
    lines.push(
      `  Total tokens: ${cumulative.inputTokens} input, ${cumulative.outputTokens} output`
    );

    // Architecture that emerged
    lines.push("");
    lines.push("  ARCHITECTURE THAT EMERGED:");
    lines.push(this.getTree());

    // Boundary splits timeline
    const boundaryActions = this.state.actions.filter(
      (a) => a.type === "propose-boundary"
    );
    if (boundaryActions.length > 0) {
      lines.push("");
      lines.push("  BOUNDARY SPLIT TIMELINE:");
      for (const a of boundaryActions) {
        lines.push(`    Round ~: ${a.description}`);
      }
    }

    // Tension summary
    lines.push("");
    lines.push("  ALL TENSIONS:");
    for (const t of this.state.tensions.values()) {
      const source = this.state.stewards.get(t.stewardId);
      const status = t.resolvedBy ? `RESOLVED (${t.resolvedBy})` : "OPEN";
      lines.push(
        `    [${t.type}] ${t.description.slice(0, 80)} — ${status}`
      );
      lines.push(
        `      ${source?.name ?? "?"} | polarity=${t.polarity} mag=${t.magnitude.toFixed(2)}`
      );
    }

    // Files created
    lines.push("");
    lines.push("  FILES IN ./workspace/:");
    for (const [filePath] of this.state.files) {
      lines.push(`    ${filePath}`);
    }

    lines.push("");
    lines.push(`${"═".repeat(60)}`);

    return lines.join("\n");
  }

  /**
   * Inject human feedback into all stewards' session histories.
   */
  injectFeedback(feedback: string): void {
    for (const steward of this.state.stewards.values()) {
      steward.sessionHistory.push(`Human feedback: ${feedback}`);
    }
    console.log(`  Feedback injected into ${this.state.stewards.size} steward(s).`);
  }
}
