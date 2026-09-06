import { expect, test } from "bun:test";
import { type Interfaces, Parser } from "@oclif/core";
import {
  cleanupFlags,
  doctorFlags,
  drainFlags,
  mutationFlags,
  syncUpstreamFlags,
} from "../src/flags.js";

test("native mutators plan by default and scratch defaults remain service-owned", async () => {
  const { flags } = await Parser.parse([], { args: {}, flags: mutationFlags, strict: true });
  expect(flags.apply).toBe(false);
  expect(flags["dry-run"]).toBe(false);
  expect(flags["scratch-file"]).toBeUndefined();
  expect(flags["scratch-mode"]).toBeUndefined();
});

test("native parsing retains explicit relative paths and exact repeated evidence", async () => {
  const { flags } = await Parser.parse(
    [
      "--repository",
      "../repo with spaces",
      "--scratch-file",
      "review/PLAN.md",
      "--scratch-file",
      "/evidence/decision.md",
      "--scratch-mode",
      "block",
      "--apply",
      "--dry-run",
    ],
    { args: {}, flags: mutationFlags, strict: true }
  );
  expect(flags.repository).toBe("../repo with spaces");
  expect(flags["scratch-file"]).toEqual(["review/PLAN.md", "/evidence/decision.md"]);
  expect(flags["scratch-mode"]).toBe("block");
  expect(flags.apply).toBe(true);
  expect(flags["dry-run"]).toBe(true);
});

test("native cleanup requires explicit trunk even when merge filtering is disabled", async () => {
  await expect(
    Parser.parse(["--prefix", "wt-owned-", "--no-merged-only"], {
      args: {},
      flags: cleanupFlags,
      strict: true,
    })
  ).rejects.toThrow();
  const { flags } = await Parser.parse(
    [
      "--prefix",
      "wt-owned-",
      "--trunk",
      "develop",
      "--no-merged-only",
      "--pin-path",
      "../wt-kept",
      "--pin-branch",
      "held/topic",
    ],
    { args: {}, flags: cleanupFlags, strict: true }
  );
  expect(flags["merged-only"]).toBe(false);
  expect(flags.trunk).toBe("develop");
  expect(flags["pin-path"]).toEqual(["../wt-kept"]);
  expect(flags["pin-branch"]).toEqual(["held/topic"]);
});

for (const [name, flags, argv] of [
  ["remote without branch", syncUpstreamFlags, ["--remote", "origin"]],
  ["branch without remote", syncUpstreamFlags, ["--branch", "main"]],
  ["scratch mode without files", mutationFlags, ["--scratch-mode", "block"]],
  [
    "unknown scratch mode",
    mutationFlags,
    ["--scratch-file", "plan.md", "--scratch-mode", "ignore"],
  ],
  ["missing cleanup prefix", cleanupFlags, ["--trunk", "main"]],
  ["empty repository", doctorFlags, ["--repository", ""]],
  ["control character path", doctorFlags, ["--repository", "a\nb"]],
  ["oversized path", doctorFlags, ["--repository", "a".repeat(16_385)]],
] as const) {
  test(`native refusal: ${name}`, async () => {
    const nativeFlags: Interfaces.FlagInput = flags;
    await expect(
      Parser.parse([...argv], { args: {}, flags: nativeFlags, strict: true })
    ).rejects.toThrow();
  });
}

for (const [name, flags, baseline, removed] of [
  ["sync", syncUpstreamFlags, [], ["--upstream-ref", "--branch-prefix", "--inspect-after"]],
  ["doctor", doctorFlags, [], ["--repo", "--branch", "--apply", "--dry-run", "--scratch-file"]],
  [
    "drain",
    drainFlags,
    [],
    ["--max-cycles", "--sleep-seconds", "--ai", "--phase", "--receipt", "--mode"],
  ],
  ["cleanup", cleanupFlags, ["--prefix", "wt-owned-", "--trunk", "main"], ["--force", "--prune"]],
] as const) {
  test(`${name} has no removed flag aliases or inherited yes control`, async () => {
    const nativeFlags: Interfaces.FlagInput = flags;
    for (const flag of [...removed, "--yes"]) {
      await expect(
        Parser.parse([...baseline, flag], { args: {}, flags: nativeFlags, strict: true })
      ).rejects.toThrow();
    }
  });
}
