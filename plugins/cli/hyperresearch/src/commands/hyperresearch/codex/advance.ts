import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { createHyperresearchCodexClientForBackend } from "../../../lib/hyperresearch-codex-binding";
import { hasBlockingV8Findings, summarizeV8Result } from "../../../lib/v8-result";

export default class HyperresearchCodexAdvance extends RawrCommand {
  static description = "Advance a Hyperresearch Codex V8 run from its durable ledger";

  static flags = {
    ...RawrCommand.baseFlags,
    ledger: Flags.string({
      required: true,
      description: "Path to research/temp/hyperresearch-codex-run.json",
    }),
    "agent-mode": Flags.string({
      options: ["packets", "synthesize"],
      default: "packets",
      description: "Packet mode waits for Codex agent outputs; synthesize mode generates fixture outputs",
    }),
    "max-steps": Flags.integer({
      required: false,
      description: "Stop after this many newly completed steps",
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
    const { flags } = await this.parseRawr(HyperresearchCodexAdvance);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const client = createHyperresearchCodexClientForBackend({
      repoRoot: process.cwd(),
      backend: String(flags.backend) as "fixture" | "real",
    });

    try {
      const resultData = await client.runtime.advanceV8Run({
        ledgerPath: String(flags.ledger),
        agentMode: String(flags["agent-mode"]) as "packets" | "synthesize",
        maxSteps: typeof flags["max-steps"] === "number" ? flags["max-steps"] : undefined,
        resumeReason: typeof flags["resume-reason"] === "string" ? flags["resume-reason"] : undefined,
      }, {
        context: {
          invocation: {
            traceId: `hyperresearch-codex-v8-advance-${Date.now()}`,
          },
        },
      });

      const responseData = summarizeV8Result(resultData);
      const blockingFindings = hasBlockingV8Findings(resultData);
      const result = blockingFindings
        ? this.fail("Hyperresearch Codex V8 advance blocked by integrity findings", {
            code: "HYPERRESEARCH_CODEX_V8_INTEGRITY_BLOCKED",
            details: responseData,
          })
        : this.ok(responseData);

      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`hyperresearch codex v8: ${resultData.status}`);
          this.log(`ledger: ${resultData.ledgerPath}`);
          if (resultData.pendingAgentJobs.length > 0) {
            this.log(`pending agent jobs: ${resultData.pendingAgentJobs.length}`);
          }
        },
      });
      if (blockingFindings) this.exit(1);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === "EEXIT") throw error;
      const result = this.fail(error instanceof Error ? error.message : String(error), {
        code: "HYPERRESEARCH_CODEX_V8_ADVANCE_FAILED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
