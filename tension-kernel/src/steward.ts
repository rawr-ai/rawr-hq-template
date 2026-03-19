import { v4 as uuid } from "uuid";
import type {
  Steward,
  SystemState,
  StewardOutput,
  StewardAction,
  Action,
  Tension,
  BoundaryProposal,
  TokenUsage,
} from "./types.js";
import { callLLMJSON } from "./llm.js";
import { buildWorkPrompt } from "./prompts.js";
import { createTension } from "./tension.js";

const MAX_HISTORY_ENTRIES = 20; // 10 pairs of user/assistant

function validatePath(path: string): boolean {
  if (!path.startsWith("workspace/")) return false;
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  return true;
}

function logAction(
  stewardId: string,
  type: Action["type"],
  description: string,
  filesAffected: string[]
): Action {
  return {
    id: uuid(),
    stewardId,
    type,
    description,
    filesAffected,
    timestamp: Date.now(),
  };
}

export interface StewardCycleResult {
  output: StewardOutput;
  actions: Action[];
  newTensions: Tension[];
  boundaryProposals: BoundaryProposal[];
  usage: TokenUsage;
  done: boolean;
}

export async function runStewardCycle(
  steward: Steward,
  state: SystemState
): Promise<StewardCycleResult> {
  const { system, userMessage } = buildWorkPrompt(steward, state);

  console.log(`  [steward:${steward.name}] Running work cycle (round ${state.round})...`);

  let output: StewardOutput;
  let usage: TokenUsage;

  try {
    const result = await callLLMJSON<StewardOutput>(system, userMessage);
    output = result.data;
    usage = result.usage;
  } catch (err) {
    console.log(
      `  [steward:${steward.name}] LLM call failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return {
      output: { reasoning: "LLM call failed", actions: [], done: false },
      actions: [],
      newTensions: [],
      boundaryProposals: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      done: false,
    };
  }

  // Log to session history
  steward.sessionHistory.push(
    `Round ${state.round}: ${output.reasoning.slice(0, 200)}${output.reasoning.length > 200 ? "..." : ""}`
  );
  if (steward.sessionHistory.length > MAX_HISTORY_ENTRIES) {
    steward.sessionHistory = steward.sessionHistory.slice(-MAX_HISTORY_ENTRIES);
  }

  const actions: Action[] = [];
  const newTensions: Tension[] = [];
  const boundaryProposals: BoundaryProposal[] = [];

  if (!Array.isArray(output.actions)) {
    console.log(`  [steward:${steward.name}] Warning: actions is not an array, skipping`);
    return { output, actions, newTensions, boundaryProposals, usage, done: output.done ?? false };
  }

  for (const action of output.actions) {
    try {
      processAction(action, steward, state, actions, newTensions, boundaryProposals);
    } catch (err) {
      console.log(
        `  [steward:${steward.name}] Action processing error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    output,
    actions,
    newTensions,
    boundaryProposals,
    usage,
    done: output.done ?? false,
  };
}

function processAction(
  action: StewardAction,
  steward: Steward,
  state: SystemState,
  actions: Action[],
  newTensions: Tension[],
  boundaryProposals: BoundaryProposal[]
): void {
  switch (action.type) {
    case "write-file": {
      if (!validatePath(action.path)) {
        console.log(`  [steward:${steward.name}] REJECTED: write to invalid path "${action.path}"`);
        // Log as system tension
        newTensions.push(
          createTension(
            steward.id,
            steward.domain,
            "boundary-stress",
            `Steward "${steward.name}" attempted to write file outside workspace: "${action.path}"`,
            [action.path]
          )
        );
        return;
      }

      // Check if another steward owns this path
      for (const [, otherSteward] of state.stewards) {
        if (
          otherSteward.id !== steward.id &&
          otherSteward.ownedPaths.includes(action.path)
        ) {
          console.log(
            `  [steward:${steward.name}] REJECTED: "${action.path}" owned by "${otherSteward.name}"`
          );
          newTensions.push(
            createTension(
              steward.id,
              steward.domain,
              "boundary-stress",
              `Steward "${steward.name}" tried to write file "${action.path}" owned by "${otherSteward.name}"`,
              [action.path, `owner: ${otherSteward.name}`]
            )
          );
          return;
        }
      }

      state.files.set(action.path, action.content);
      if (!steward.ownedPaths.includes(action.path)) {
        steward.ownedPaths.push(action.path);
      }
      actions.push(
        logAction(steward.id, "write-file", action.why, [action.path])
      );
      console.log(`  [steward:${steward.name}] Wrote: ${action.path}`);
      break;
    }

    case "modify-file": {
      if (!validatePath(action.path)) {
        console.log(`  [steward:${steward.name}] REJECTED: modify invalid path "${action.path}"`);
        newTensions.push(
          createTension(
            steward.id,
            steward.domain,
            "boundary-stress",
            `Steward "${steward.name}" attempted to modify file outside workspace: "${action.path}"`,
            [action.path]
          )
        );
        return;
      }

      if (!steward.ownedPaths.includes(action.path)) {
        console.log(
          `  [steward:${steward.name}] REJECTED: doesn't own "${action.path}"`
        );
        newTensions.push(
          createTension(
            steward.id,
            steward.domain,
            "boundary-stress",
            `Steward "${steward.name}" tried to modify file "${action.path}" it doesn't own`,
            [action.path, `owned paths: ${steward.ownedPaths.join(", ")}`]
          )
        );
        return;
      }

      state.files.set(action.path, action.content);
      actions.push(
        logAction(steward.id, "modify-file", action.why, [action.path])
      );
      console.log(`  [steward:${steward.name}] Modified: ${action.path}`);
      break;
    }

    case "log-tension": {
      const t = createTension(
        steward.id,
        steward.domain,
        action.tension.type,
        action.tension.description,
        action.tension.evidence
      );
      newTensions.push(t);
      steward.ledger.push(t);
      actions.push(
        logAction(steward.id, "log-tension", t.description, [])
      );
      console.log(
        `  [steward:${steward.name}] Logged tension: ${t.type} — "${t.description.slice(0, 80)}..."`
      );
      break;
    }

    case "propose-boundary": {
      boundaryProposals.push({
        proposingStewardId: steward.id,
        newDomain: action.newDomain,
        newName: action.newName,
        paths: action.paths,
        reason: action.reason,
      });
      actions.push(
        logAction(steward.id, "propose-boundary", action.reason, action.paths)
      );
      console.log(
        `  [steward:${steward.name}] Proposed boundary: "${action.newName}" (${action.newDomain})`
      );
      break;
    }

    case "resolve-tension": {
      const tension = state.tensions.get(action.tensionId);
      if (tension) {
        tension.resolvedBy = steward.id;
        actions.push(
          logAction(steward.id, "resolve-tension", action.how, [])
        );
        console.log(
          `  [steward:${steward.name}] Resolved tension: ${action.tensionId}`
        );
      } else {
        // Also check steward's own ledger
        const ledgerTension = steward.ledger.find(
          (t) => t.id === action.tensionId
        );
        if (ledgerTension) {
          ledgerTension.resolvedBy = steward.id;
          actions.push(
            logAction(steward.id, "resolve-tension", action.how, [])
          );
          console.log(
            `  [steward:${steward.name}] Resolved tension (ledger): ${action.tensionId}`
          );
        } else {
          console.log(
            `  [steward:${steward.name}] Warning: tension ${action.tensionId} not found`
          );
        }
      }
      break;
    }

    default:
      console.log(
        `  [steward:${steward.name}] Unknown action type: ${(action as { type: string }).type}`
      );
  }
}
