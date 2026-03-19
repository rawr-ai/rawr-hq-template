import * as readline from "node:readline";
import { TensionKernel } from "./kernel.js";

const DEFAULT_OBJECTIVE =
  "Build a REST API for task management. Users can create tasks with a title and description, mark them complete, list all tasks, and delete tasks. Use Express.js. Include basic input validation. The API should work when tested with curl.";

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function prompt(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main(): Promise<void> {
  const rl = createReadline();

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║        TENSION KERNEL — Proof of Concept        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("This system uses tension as the only architectural primitive.");
  console.log("Stewards build code, log tensions, and discover boundaries.");
  console.log("");

  const objectiveInput = await prompt(
    rl,
    `Enter objective (or press enter for default):\n> `
  );
  const objective = objectiveInput.trim() || DEFAULT_OBJECTIVE;

  console.log(`\nObjective: ${objective}`);
  console.log("");

  const kernel = new TensionKernel(objective);
  kernel.setReadline(rl);

  console.log("Root steward created with full scope.");
  console.log("Commands: [enter]=next round, 'status', 'tree', 'done', or type feedback");
  console.log("");

  let running = true;

  while (running) {
    try {
      const summary = await kernel.runRound();

      // Check if all stewards are done
      const allDone = summary.stewardResults.every((sr) => sr.done);
      if (allDone) {
        console.log(
          "\n★ All stewards believe work is complete."
        );
        console.log("  Review ./workspace/ and provide feedback or type 'done'.");
      }
    } catch (err) {
      console.error(
        `\nError during round: ${err instanceof Error ? err.message : String(err)}`
      );
      console.log("Continuing to next round...");
    }

    const input = await prompt(
      rl,
      "\n[enter=continue | feedback | status | tree | done] > "
    );
    const trimmed = input.trim().toLowerCase();

    if (trimmed === "done") {
      running = false;
    } else if (trimmed === "status") {
      console.log(kernel.getStatus());
    } else if (trimmed === "tree") {
      console.log(kernel.getTree());
    } else if (trimmed === "") {
      // Continue to next round
    } else {
      // Treat as feedback
      kernel.injectFeedback(input.trim());
    }
  }

  console.log(kernel.getFinalReport());
  rl.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
