import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { type HyperresearchTier } from "@rawr/hyperresearch-codex/types";
import { FixtureHyperresearchCliBackend } from "../../lib/fixture-cli";
import { NodeHyperresearchCliBackend } from "../../lib/hyperresearch-codex-resources/cli";
import { createHyperresearchCodexClient } from "../../lib/hyperresearch-codex-binding";

export default class HyperresearchCodexSlice extends RawrCommand {
  static description = "Run the synthetic Hyperresearch Codex control-plane slice";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({
      required: true,
      description: "Canonical research query to persist in the run ledger",
    }),
    tier: Flags.string({
      options: ["light", "full"],
      default: "light",
      description: "Hyperresearch tier route to record for this run",
    }),
    vault: Flags.string({
      required: true,
      description: "Vault root for the synthetic run",
    }),
    steps: Flags.string({
      required: true,
      description: "Directory containing synthetic step files",
    }),
    "max-steps": Flags.integer({
      required: false,
      description: "Stop after this many newly completed steps to test resume behavior",
    }),
    "resume-reason": Flags.string({
      required: false,
      description: "Reason recorded in the run ledger when resuming",
    }),
    backend: Flags.string({
      options: ["real", "fixture"],
      default: "fixture",
      description: "Use a successful fixture backend or the installed hyperresearch CLI",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HyperresearchCodexSlice);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const backend =
      String(flags.backend) === "fixture"
        ? new FixtureHyperresearchCliBackend()
        : new NodeHyperresearchCliBackend();
    const client = createHyperresearchCodexClient({
      repoRoot: process.cwd(),
      cli: backend,
    });

    try {
      const resultData = await client.fixtures.runSyntheticSlice(
        {
          canonicalQuery: String(flags.query),
          tier: String(flags.tier) as HyperresearchTier,
          vaultRoot: String(flags.vault),
          stepsRoot: String(flags.steps),
          maxSteps: typeof flags["max-steps"] === "number" ? flags["max-steps"] : undefined,
          resumeReason:
            typeof flags["resume-reason"] === "string" ? flags["resume-reason"] : undefined,
        },
        {
          context: {
            invocation: {
              traceId: `hyperresearch-codex-slice-${Date.now()}`,
            },
          },
        }
      );

      const responseData = {
        ledgerPath: resultData.ledgerPath,
        runId: resultData.ledger.runId,
        completed: resultData.ledger.completed,
        currentStepId: resultData.ledger.currentStepId,
        completedSteps: resultData.ledger.steps
          .filter((step) => step.status === "complete")
          .map((step) => step.id),
        cliCalls: resultData.ledger.cliCalls.map((call) => ({
          operation: call.operation,
          exitCode: call.exitCode,
        })),
        integrity: resultData.integrity,
      };

      const blockingFindings = resultData.integrity.filter(
        (finding) => finding.severity === "blocking"
      );
      const result =
        blockingFindings.length > 0
          ? this.fail("Hyperresearch Codex slice blocked by integrity findings", {
              code: "HYPERRESEARCH_CODEX_INTEGRITY_BLOCKED",
              details: responseData,
            })
          : this.ok(responseData);

      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(
            `hyperresearch codex slice: ${resultData.ledger.completed ? "complete" : "incomplete"}`
          );
          this.log(`ledger: ${resultData.ledgerPath}`);
          if (resultData.integrity.length > 0) {
            this.log(`integrity findings: ${resultData.integrity.length}`);
          }
        },
      });
      if (blockingFindings.length > 0) this.exit(1);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_SLICE_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
