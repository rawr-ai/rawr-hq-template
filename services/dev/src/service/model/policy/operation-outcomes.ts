import type {
  DevCommandStep,
  DevExecution,
  DevIssue,
  DevPreflight,
} from "../dto/operation-outcomes.dto";

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
