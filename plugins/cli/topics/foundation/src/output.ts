/** Await the native write callback so large Bun output is complete before finalization. */
export function writeJsonResult(value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`, (error) => {
      if (error && !("code" in error && error.code === "EPIPE")) reject(error);
      else resolve();
    });
  });
}
