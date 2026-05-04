import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createHyperresearchCodexClientForBackend } from "../../../lib/hyperresearch-codex-binding";
import { hasBlockingV8Findings, summarizeV8Result } from "../../../lib/v8-result";

export default class HyperresearchCodexStart extends RawrCommand {
  static description = "Start a Hyperresearch Codex V8 run ledger";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({
      required: true,
      description: "Canonical research query to persist in the V8 ledger",
    }),
    tier: Flags.string({
      options: ["auto", "light", "full"],
      default: "auto",
      description: "Tier request; auto currently defaults to light until step-1 classification is proven",
    }),
    vault: Flags.string({
      required: true,
      description: "Vault root for the V8 run",
    }),
    steps: Flags.string({
      required: true,
      description: "Directory containing Hyperresearch V8 step reference files",
    }),
    "vault-tag": Flags.string({
      required: false,
      description: "Optional explicit vault tag",
    }),
    backend: Flags.string({
      options: ["real", "fixture"],
      default: "fixture",
      description: "Use a successful fixture backend or the installed hyperresearch CLI",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HyperresearchCodexStart);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const client = createHyperresearchCodexClientForBackend({
      repoRoot: process.cwd(),
      backend: String(flags.backend) as "fixture" | "real",
    });

    try {
      const resultData = await client.runs.startV8Run({
        canonicalQuery: String(flags.query),
        tier: String(flags.tier) as "auto" | "light" | "full",
        vaultRoot: String(flags.vault),
        stepsRoot: String(flags.steps),
        vaultTag: typeof flags["vault-tag"] === "string" ? flags["vault-tag"] : undefined,
      }, {
        context: {
          invocation: {
            traceId: `hyperresearch-codex-v8-start-${Date.now()}`,
          },
        },
      });

      const responseData = summarizeV8Result(resultData);
      const blockingFindings = hasBlockingV8Findings(resultData);
      const result = blockingFindings
        ? this.fail("Hyperresearch Codex V8 start blocked by integrity findings", {
            code: "HYPERRESEARCH_CODEX_V8_INTEGRITY_BLOCKED",
            details: responseData,
          })
        : this.ok(responseData);

      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`hyperresearch codex v8: ${resultData.status}`);
          this.log(`ledger: ${resultData.ledgerPath}`);
        },
      });
      if (blockingFindings) this.exit(1);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_V8_START_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
