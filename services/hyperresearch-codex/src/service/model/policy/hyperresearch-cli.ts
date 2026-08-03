import type {
  HyperresearchCliCall,
  HyperresearchCliOperation,
  HyperresearchRunLedger,
} from "../entities";
import type { HyperresearchCliResult } from "../ports";

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

export function assertAllowedHyperresearchOperation(
  operation: string
): asserts operation is HyperresearchCliOperation {
  if (!allowedOperations.has(operation as HyperresearchCliOperation)) {
    throw new Error(`Unsupported Hyperresearch CLI operation: ${operation}`);
  }
}

export function recordHyperresearchCliCall(input: {
  operation: HyperresearchCliOperation;
  args: string[];
  cwd: string;
  startedAt: string;
  completedAt: string;
  result: HyperresearchCliResult;
  ledger: HyperresearchRunLedger;
  throwOnFailure?: boolean;
}): HyperresearchCliCall {
  assertAllowedHyperresearchOperation(input.operation);
  const call: HyperresearchCliCall = {
    operation: input.operation,
    args: input.args,
    cwd: input.cwd,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    exitCode: input.result.exitCode,
    stdout: input.result.stdout,
    stderr: input.result.stderr,
  };
  input.ledger.cliCalls.push(call);
  if (input.result.exitCode !== 0) {
    input.ledger.failures.push({
      at: input.completedAt,
      kind: "cli",
      message: `Hyperresearch CLI ${input.operation} failed with exit code ${input.result.exitCode}`,
    });
    if (input.throwOnFailure) {
      throw new Error(
        `Hyperresearch CLI ${input.operation} failed with exit code ${input.result.exitCode}`
      );
    }
  }
  return call;
}
