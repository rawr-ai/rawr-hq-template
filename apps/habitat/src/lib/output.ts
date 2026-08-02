/**
 * Writes one complete Habitat command result as JSON before the command returns.
 *
 * Awaiting the stream callback prevents Bun from ending the process while a
 * large stdout write is still buffered at the Oclif process boundary. EPIPE
 * remains successful because it means the downstream pipe deliberately
 * stopped reading, matching Oclif's stdout behavior.
 */
export function writeJsonResult(result: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`, (error) => {
      if (error && !isBrokenPipe(error)) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function isBrokenPipe(error: Error): boolean {
  return "code" in error && error.code === "EPIPE";
}
