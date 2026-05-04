import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createHyperresearchCodexClientForBackend } from "../../../lib/hyperresearch-codex-binding";
import { hasBlockingV8Findings, summarizeV8Result } from "../../../lib/v8-result";

export default class HyperresearchCodexRunFixture extends RawrCommand {
  static description = "Run a Hyperresearch Codex V8 fixture route to completion";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({
      required: true,
      description: "Canonical research query to persist in the V8 ledger",
    }),
    tier: Flags.string({
      options: ["light", "full"],
      default: "light",
      description: "Fixture tier route to execute",
    }),
    vault: Flags.string({
      required: true,
      description: "Vault root for the V8 fixture run",
    }),
    steps: Flags.string({
      required: true,
      description: "Directory containing Hyperresearch V8 step reference files",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HyperresearchCodexRunFixture);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const client = createHyperresearchCodexClientForBackend({
      repoRoot: process.cwd(),
      backend: "fixture",
    });

    try {
      let resultData = await client.runs.startV8Run({
        canonicalQuery: String(flags.query),
        tier: String(flags.tier) as "light" | "full",
        vaultRoot: String(flags.vault),
        stepsRoot: String(flags.steps),
      }, {
        context: {
          invocation: {
            traceId: `hyperresearch-codex-v8-fixture-start-${Date.now()}`,
          },
        },
      });

      for (let pass = 0; pass < 64 && resultData.status !== "complete" && resultData.status !== "blocked"; pass += 1) {
        resultData = await client.runs.advanceV8Run({
          ledgerPath: resultData.ledgerPath,
          agentMode: "synthesize",
        }, {
          context: {
            invocation: {
              traceId: `hyperresearch-codex-v8-fixture-advance-${Date.now()}-${pass}`,
            },
          },
        });
      }

      const responseData = summarizeV8Result(resultData);
      const blockingFindings = hasBlockingV8Findings(resultData) || resultData.status !== "complete";
      const result = blockingFindings
        ? this.fail("Hyperresearch Codex V8 fixture did not pass integrity gates", {
            code: "HYPERRESEARCH_CODEX_V8_FIXTURE_BLOCKED",
            details: responseData,
          })
        : this.ok(responseData);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`hyperresearch codex v8 fixture: ${resultData.status}`);
          this.log(`ledger: ${resultData.ledgerPath}`);
        },
      });
      if (blockingFindings) this.exit(1);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_V8_FIXTURE_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
