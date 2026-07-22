import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCliInvocation } from "../src/lib/subprocess";

describe("CLI subprocess invocation", () => {
  it("uses the current runtime, Oclif entrypoint, and operator process context", () => {
    const entrypoint = process.argv[1];
    if (entrypoint === undefined) throw new Error("test entrypoint is required");

    const result = resolveCliInvocation();

    expect(result).toMatchObject({
      cmd: process.execPath,
      args: [path.resolve(entrypoint)],
      cwd: process.cwd(),
    });
    expect(result.env).toEqual(process.env);
    expect(result.env).not.toBe(process.env);
  });
});
