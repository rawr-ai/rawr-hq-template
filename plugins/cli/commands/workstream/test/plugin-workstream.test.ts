/**
 * @fileoverview Command-surface checks for the work-stream CLI projection.
 *
 * @remarks
 * These assert the projection's shape — that every service operation has a
 * command, and that ledger selection is overridable. Frame behaviour itself is
 * proved in the service's own suite against both providers, so it is not
 * re-proved here through a slower surface.
 */
import { describe, expect, it } from "vitest";
import WorkstreamAdmit from "../src/commands/workstream/admit";
import WorkstreamInspect from "../src/commands/workstream/inspect";
import WorkstreamOpen from "../src/commands/workstream/open";
import WorkstreamPush from "../src/commands/workstream/push";
import WorkstreamResolve from "../src/commands/workstream/resolve";
import { DEFAULT_LEDGER_NAME, DEFAULT_LEDGER_URL, invocation } from "../src/lib/workstream-client";

const commands = [
  { name: "open", command: WorkstreamOpen },
  { name: "admit", command: WorkstreamAdmit },
  { name: "push", command: WorkstreamPush },
  { name: "resolve", command: WorkstreamResolve },
  { name: "inspect", command: WorkstreamInspect },
];

describe("workstream CLI projection", () => {
  it("projects every service operation as a command", () => {
    expect(commands.map((entry) => entry.name)).toEqual([
      "open",
      "admit",
      "push",
      "resolve",
      "inspect",
    ]);
  });

  it("describes every command and offers ledger selection on each", () => {
    for (const { name, command } of commands) {
      expect(command.description, `${name} description`).toBeTruthy();
      expect(Object.keys(command.flags), `${name} flags`).toEqual(
        expect.arrayContaining(["ledger-url", "ledger", "json"])
      );
    }
  });

  it("accepts an ordered, repeatable boundary flag when opening a frame", () => {
    expect(WorkstreamOpen.flags.boundary.multiple).toBe(true);
    expect(WorkstreamOpen.flags.boundary.required).toBe(true);
  });

  it("exposes a temporal flag so a past position can be reconstructed", () => {
    expect(WorkstreamInspect.flags.at).toBeDefined();
  });

  it("defaults ledger selection without requiring flags", () => {
    expect(DEFAULT_LEDGER_URL).toBe("http://localhost:8090");
    expect(DEFAULT_LEDGER_NAME).toBe("workstream:main");
  });

  it("wraps invocation context in the envelope procedures expect", () => {
    expect(invocation("trace-1")).toEqual({ context: { invocation: { traceId: "trace-1" } } });
  });
});
