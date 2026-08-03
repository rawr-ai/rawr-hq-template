import type {
  DevCommandStep,
  DevExecution,
  DevIssue,
  DevPreflight,
} from "../dto/operation-outcomes.dto";
import type { DevExecResult } from "../ports/dev-resources";

const textDecoder = new TextDecoder();

/** Renders one command and its arguments for operator diagnostics. */
export function commandText(command: string, args: string[]): string {
  return [command, ...args].join(" ");
}

/** Describes an external command that a plan would execute. */
export function planned(command: string, args: string[]): DevCommandStep {
  return { command, args, status: "planned" };
}

/** Describes an external command deliberately omitted from the applied prefix. */
export function skipped(command: string, args: string[], stderr?: string): DevCommandStep {
  return { command, args, status: "skipped", stderr };
}

/** Projects one completed host process observation into an operation step. */
export function observedStep(
  command: string,
  args: string[],
  result: DevExecResult
): DevCommandStep {
  return {
    command,
    args,
    status: result.exitCode === 0 ? "succeeded" : "failed",
    exitCode: result.exitCode,
    stdout: textDecoder.decode(result.stdout),
    stderr: textDecoder.decode(result.stderr),
  };
}

/** Projects a thrown host process failure into the same operation step vocabulary. */
export function rejectedStep(command: string, args: string[], error: unknown): DevCommandStep {
  return {
    command,
    args,
    status: "failed",
    exitCode: null,
    stdout: "",
    stderr: error instanceof Error ? error.message : String(error),
  };
}

/** Constructs an error that blocks admission or records failed execution. */
export function issue(code: string, message: string, details?: Record<string, unknown>): DevIssue {
  return { code, message, severity: "error", details };
}

/** Constructs a non-blocking warning for an otherwise admissible operation. */
export function warning(
  code: string,
  message: string,
  details?: Record<string, unknown>
): DevIssue {
  return { code, message, severity: "warning", details };
}

/** Reduces ordered admission issues to the shared Dev preflight result. */
export function preflight(issues: DevIssue[]): DevPreflight {
  return { ok: !issues.some((item) => item.severity === "error"), issues };
}

/** Reduces ordered runtime issues to the shared Dev execution result. */
export function execution(issues: DevIssue[] = []): DevExecution {
  return preflight(issues);
}

/** Converts a failed command step into the operation's qualified execution issue. */
export function executionIssueFromStep(
  step: DevCommandStep,
  code: string,
  message: string
): DevIssue | null {
  if (step.status !== "failed") return null;
  return issue(code, message, {
    command: commandText(step.command, step.args),
    exitCode: step.exitCode ?? null,
    stderr: step.stderr ?? "",
  });
}
