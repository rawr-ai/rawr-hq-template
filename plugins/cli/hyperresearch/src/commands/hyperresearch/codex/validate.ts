import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { FixtureHyperresearchCliBackend } from "../../../lib/fixture-cli";
import { createHyperresearchCodexClient } from "../../../lib/hyperresearch-codex-binding";
import { summarizeV8ValidationResult } from "../../../lib/v8-result";

export default class HyperresearchCodexValidate extends RawrCommand {
  static description = "Validate Hyperresearch Codex V8 integrity gates";

  static flags = {
    ...RawrCommand.baseFlags,
    ledger: Flags.string({
      required: true,
      description: "Path to research/temp/hyperresearch-codex-run.json",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HyperresearchCodexValidate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const client = createHyperresearchCodexClient({
      repoRoot: process.cwd(),
      cli: new FixtureHyperresearchCliBackend(),
    });

    try {
      const resultData = await client.runtime.validateV8Run({
        ledgerPath: String(flags.ledger),
      }, {
        context: {
          invocation: {
            traceId: `hyperresearch-codex-v8-validate-${Date.now()}`,
          },
        },
      });
      const responseData = summarizeV8ValidationResult(resultData);
      const result = !resultData.passed
        ? this.fail("Hyperresearch Codex V8 validation blocked by integrity findings", {
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
      if (!resultData.passed) this.exit(1);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_V8_VALIDATE_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
