import type {
  HyperresearchCliCall,
  HyperresearchCliOperation,
  HyperresearchRunLedger,
} from "../entities";
import type {
  HyperresearchCliBackend,
  HyperresearchCodexIO,
} from "../resources";

const allowedOperations = new Set<HyperresearchCliOperation>([
  "init",
  "status",
  "search",
  "fetch",
  "fetch-batch",
  "note",
  "graph",
  "lint",
  "sync",
  "repair",
  "export",
]);

export function assertAllowedHyperresearchOperation(operation: string): asserts operation is HyperresearchCliOperation {
  if (!allowedOperations.has(operation as HyperresearchCliOperation)) {
    throw new Error(`Unsupported Hyperresearch CLI operation: ${operation}`);
  }
}

export async function runHyperresearchCli(input: {
  operation: HyperresearchCliOperation;
  args: string[];
  cwd: string;
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
  ledger: HyperresearchRunLedger;
  throwOnFailure?: boolean;
}): Promise<HyperresearchCliCall> {
  assertAllowedHyperresearchOperation(input.operation);
  const startedAt = input.io.now();
  const result = await input.cli.run({
    operation: input.operation,
    args: input.args,
    cwd: input.cwd,
  });
  const completedAt = input.io.now();
  const call: HyperresearchCliCall = {
    operation: input.operation,
    args: input.args,
    cwd: input.cwd,
    startedAt,
    completedAt,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  input.ledger.cliCalls.push(call);
  if (result.exitCode !== 0) {
    input.ledger.failures.push({
      at: completedAt,
      kind: "cli",
      message: `Hyperresearch CLI ${input.operation} failed with exit code ${result.exitCode}`,
    });
    if (input.throwOnFailure) {
      throw new Error(`Hyperresearch CLI ${input.operation} failed with exit code ${result.exitCode}`);
    }
  }
  return call;
}
