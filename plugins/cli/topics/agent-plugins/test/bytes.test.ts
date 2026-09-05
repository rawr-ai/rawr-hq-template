import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  MAX_CURRENT_MAIN_RECORD_BYTES,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
} from "@habitat-ai/agent-plugin-lifecycle-service/client";
import { checkCommand } from "../src/commands/check.js";
import { readReleaseInput } from "../src/flags.js";
import { parse } from "./support/fixture.js";

async function* chunks(...values: unknown[]) {
  yield* values;
}
const encode = (text: string) => new TextEncoder().encode(text);

test("envelope bytes retain whitespace, chunk boundaries and caller-owned buffers", async () => {
  const first = encode(' \n{"body":');
  const second = encode('{},"releaseInputDigest":"untrusted"}\n ');
  const expected = new Uint8Array([...first, ...second]);
  const input = await readReleaseInput(chunks(first, second), false);
  first.fill(0);
  second.fill(0);
  expect(input.kind).toBe("validate-envelope");
  if (input.kind !== "validate-envelope") throw new Error("Expected exact byte request");
  expect(input.bytes).toEqual(expected);
});

test("invalid UTF-8 and JSON remain domain byte-validation requests", async () => {
  for (const bytes of [Uint8Array.from([0x20, 0xff, 0x0a]), encode(" { broken json \n")]) {
    const input = await readReleaseInput(chunks(bytes), false);
    expect(input).toEqual({ kind: "validate-envelope", bytes });
  }
});

test("syntactic bodies keep service-owned domain validation, not a private codec", async () => {
  for (const body of [{ schemaVersion: 99 }, null, ["not", "a", "body"]]) {
    expect(await readReleaseInput(chunks(encode(JSON.stringify(body))), false)).toEqual({
      kind: "encode-body",
      body,
    });
  }
  for (const body of [{ body: null }, { releaseInputDigest: "invalid" }]) {
    const bytes = encode(JSON.stringify(body));
    expect(await readReleaseInput(chunks(bytes), false)).toEqual({
      kind: "validate-envelope",
      bytes,
    });
  }
});

test("each raw read is invocation-local and never consumes a prior cached value", async () => {
  const first = await readReleaseInput(chunks(encode('{"first":true}')), false);
  const second = await readReleaseInput(chunks(encode('{"second":true}')), false);
  expect(first).toEqual({ kind: "encode-body", body: { first: true } });
  expect(second).toEqual({ kind: "encode-body", body: { second: true } });
});

test("TTY, empty, non-byte and oversized transport refuse before service dispatch", async () => {
  await expect(readReleaseInput(chunks(), true)).rejects.toThrow("piped stdin");
  await expect(readReleaseInput(chunks(), false)).rejects.toThrow("nonempty stdin");
  await expect(readReleaseInput(chunks("already decoded"), false)).rejects.toThrow(
    "must contain bytes"
  );
  let closed = false;
  let reachedTail = false;
  const input = (async function* () {
    try {
      yield Uint8Array.of(1);
      yield new Uint8Array(MAX_RELEASE_INPUT_ENVELOPE_BYTES);
      reachedTail = true;
    } finally {
      closed = true;
    }
  })();
  await expect(readReleaseInput(input, false)).rejects.toThrow("protocol byte limit");
  expect(closed).toBe(true);
  expect(reachedTail).toBe(false);
});

test("current-main raw JSON is byte-bounded but content failures stay with governance", async () => {
  const text = "  not JSON\n";
  const parsed = await parse(checkCommand, [
    "--mode",
    "current-main-record",
    "--current-main-record-json",
    text,
  ]);
  expect(parsed.flags["current-main-record-json"]).toEqual({
    kind: "validate-record",
    bytes: encode(text),
  });
  await expect(
    parse(checkCommand, ["--mode", "current-main-record", "--current-main-record-json", ""])
  ).rejects.toThrow("nonempty");
  const multibyte = "\u00e9".repeat(MAX_CURRENT_MAIN_RECORD_BYTES / 2 + 1);
  expect(multibyte.length).toBeLessThan(MAX_CURRENT_MAIN_RECORD_BYTES);
  await expect(
    parse(checkCommand, ["--mode", "current-main-record", "--current-main-record-json", multibyte])
  ).rejects.toThrow("protocol byte limit");
});

async function nativeStdin(bytes: Uint8Array) {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL("./support/parse-stdin.ts", import.meta.url)),
      "--mode",
      "release-input-record",
    ],
    { stdio: ["pipe", "pipe", "pipe"] }
  );
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  child.stdin.on("error", () => undefined);
  const closed = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, 5_000);
  child.stdin.end(bytes);
  try {
    const code = await closed;
    if (timedOut) throw new Error("Native stdin parser did not settle");
    return {
      code,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    };
  } finally {
    clearTimeout(timer);
  }
}

test("actual native mode parser reads piped bytes rather than Oclif trimming or cache", async () => {
  for (const bytes of [
    encode(' \n{"body":{},"releaseInputDigest":"untrusted"}\n '),
    Uint8Array.from([0xff, 0x0a]),
  ]) {
    const child = await nativeStdin(bytes);
    expect(child.code).toBe(0);
    expect(child.stderr).toBe("");
    expect(JSON.parse(child.stdout)).toEqual({
      input: { kind: "validate-envelope", bytes: Array.from(bytes) },
      cacheUnchanged: true,
    });
  }
  const body = await nativeStdin(encode('{"unknownDomainField":true}'));
  expect(body.code).toBe(0);
  expect(JSON.parse(body.stdout)).toEqual({
    input: { kind: "encode-body", body: { unknownDomainField: true } },
    cacheUnchanged: true,
  });
  const empty = await nativeStdin(new Uint8Array());
  expect(empty.code).toBe(2);
  expect(empty.stderr).toContain("nonempty stdin");
  expect(empty.stdout).toBe("");
}, 15_000);
