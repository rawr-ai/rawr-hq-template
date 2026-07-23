import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { FixtureHyperresearchCliBackend } from "../../../lib/fixture-cli";
import { createHyperresearchCodexClient } from "../../../lib/hyperresearch-codex-binding";
import { summarizeV8Result } from "../../../lib/v8-result";

export default class HyperresearchCodexInspect extends RawrCommand {
  static description = "Inspect a Hyperresearch Codex V8 run ledger";

  static flags = {
    ...RawrCommand.baseFlags,
    ledger: Flags.string({
      required: true,
      description: "Path to research/temp/hyperresearch-codex-run.json",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HyperresearchCodexInspect);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const client = createHyperresearchCodexClient({
      repoRoot: process.cwd(),
      cli: new FixtureHyperresearchCliBackend(),
    });

    try {
      const resultData = await client.runs.inspectV8Run(
        {
          ledgerPath: String(flags.ledger),
        },
        {
          context: {
            invocation: {
              traceId: `hyperresearch-codex-v8-inspect-${Date.now()}`,
            },
          },
        }
      );
      const result = this.ok(summarizeV8Result(resultData));
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`hyperresearch codex v8: ${resultData.status}`);
          this.log(`ledger: ${resultData.ledgerPath}`);
        },
      });
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_V8_INSPECT_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
