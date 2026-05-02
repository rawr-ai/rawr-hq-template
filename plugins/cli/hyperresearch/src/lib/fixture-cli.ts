import type {
  HyperresearchCliOperation,
  HyperresearchCliResult,
} from "@rawr/hyperresearch-codex";
import type { HyperresearchCliBackend } from "@rawr/hyperresearch-codex/resources";

export class FixtureHyperresearchCliBackend implements HyperresearchCliBackend {
  readonly calls: Array<{ operation: HyperresearchCliOperation; args: string[]; cwd: string }> = [];

  async run(input: {
    operation: HyperresearchCliOperation;
    args: string[];
    cwd: string;
  }): Promise<HyperresearchCliResult> {
    this.calls.push(input);
    return {
      exitCode: 0,
      stdout: JSON.stringify({ ok: true, operation: input.operation }),
    };
  }
}
