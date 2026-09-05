import { Parser } from "@oclif/core";
import { checkFlags } from "../../src/flags.js";

const cache = "native cached stdin is not this invocation";
const nativeGlobals = Object.assign(globalThis, { oclif: { stdinCache: cache } });
try {
  const parsed = await Parser.parse(process.argv.slice(2), {
    args: {},
    flags: checkFlags,
    strict: true,
  });
  const mode = parsed.flags.mode;
  if (mode?.kind !== "release-input-record") throw new Error("Expected release-input mode");
  const input =
    mode.input.kind === "validate-envelope"
      ? { kind: mode.input.kind, bytes: Array.from(mode.input.bytes) }
      : mode.input;
  process.stdout.write(
    JSON.stringify({ input, cacheUnchanged: nativeGlobals.oclif.stdinCache === cache })
  );
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 2;
}
