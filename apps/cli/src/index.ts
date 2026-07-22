import { flush, handle, run, type Interfaces } from "@oclif/core";

import { prepareControllerInvocation } from "./lib/controller/entry-bootstrap";
import { loadControllerRuntimeContext } from "./lib/controller/runtime-context";

class InterceptedExit extends Error {
  code: number;
  constructor(code: number) {
    super(`Intercepted process.exit(${code})`);
    this.code = code;
  }
}

async function runCli(
  argv: string[] = process.argv.slice(2),
  options: Interfaces.LoadOptions = import.meta.url
): Promise<void> {
  let exitCode = 0;
  const originalExit = process.exit;
  (process as any).exit = (code?: number) => {
    throw new InterceptedExit(typeof code === "number" ? code : 0);
  };

  try {
    await run(argv, options);
    await flush();
  } catch (err) {
    if (err instanceof InterceptedExit) {
      exitCode = err.code;
    } else {
      try {
        handle(err as any);
      } catch (handleErr) {
        if (handleErr instanceof InterceptedExit) exitCode = handleErr.code;
        else throw handleErr;
      }
      if (exitCode === 0) exitCode = 1;
    }
  } finally {
    (process as any).exit = originalExit;
    process.exitCode = exitCode;
  }
}

export async function runControllerCli(
  input: Readonly<{
    argv?: readonly string[];
    entryUrl: string | URL;
  }>
): Promise<void> {
  const argv = [...(input.argv ?? process.argv.slice(2))];
  let context;
  try {
    context = await loadControllerRuntimeContext({ entryUrl: input.entryUrl });
  } catch (error) {
    process.stderr.write(`rawr: ${errorMessage(error)}\n`);
    process.exitCode = 78;
    return;
  }

  try {
    const invocation = await prepareControllerInvocation({ argv, context });
    await runCli(argv, invocation.config);
  } catch (error) {
    process.stderr.write(`rawr: ${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  await runControllerCli({ entryUrl: import.meta.url });
}
