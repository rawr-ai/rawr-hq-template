import type { DevCommandStep } from "../dto/operation-outcomes.dto";
import type { DevProcessResource } from "../ports/dev-resources";

const textDecoder = new TextDecoder();

/**
 * Executes one external command through the admitted host capability.
 *
 * The result remains data: operation handlers decide whether a failed step
 * blocks, truncates, or merely informs their own outcome.
 */
export async function execStep(
  process: DevProcessResource,
  workspaceRoot: string,
  command: string,
  args: string[],
  timeoutMs?: number
): Promise<DevCommandStep> {
  let result;
  try {
    result = await process.exec(command, args, { cwd: workspaceRoot, timeoutMs });
  } catch (error) {
    return {
      command,
      args,
      status: "failed",
      exitCode: null,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    command,
    args,
    status: result.exitCode === 0 ? "succeeded" : "failed",
    exitCode: result.exitCode,
    stdout: textDecoder.decode(result.stdout),
    stderr: textDecoder.decode(result.stderr),
  };
}
