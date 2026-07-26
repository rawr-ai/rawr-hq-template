/**
 * @fileoverview Command-surface checks for the work-stream CLI projection.
 *
 * @remarks
 * These assert the projection's shape — that every service operation has a
 * command, and that ledger and revision selection are overridable. Frame
 * behaviour itself is proved in the service's own suite against both providers,
 * so it is not re-proved here through a slower surface.
 */
import { describe, expect, it } from "vitest";
import WorkstreamAdmit from "../src/commands/workstream/admit";
import WorkstreamClose from "../src/commands/workstream/close";
import WorkstreamInspect from "../src/commands/workstream/inspect";
import WorkstreamOpen from "../src/commands/workstream/open";
import WorkstreamPush from "../src/commands/workstream/push";
import WorkstreamResolve from "../src/commands/workstream/resolve";
import WorkstreamRevision from "../src/commands/workstream/revision";
import WorkstreamTrace from "../src/commands/workstream/trace";
import { DEFAULT_LEDGER_NAME, DEFAULT_LEDGER_URL, invocation } from "../src/lib/workstream-client";

const commands = [
  { name: "open", command: WorkstreamOpen },
  { name: "admit", command: WorkstreamAdmit },
  { name: "push", command: WorkstreamPush },
  { name: "resolve", command: WorkstreamResolve },
  { name: "close", command: WorkstreamClose },
  { name: "inspect", command: WorkstreamInspect },
  { name: "trace", command: WorkstreamTrace },
  { name: "revision", command: WorkstreamRevision },
];

/** Commands addressing one stream inside a revision, rather than the revision set. */
const streamScoped = commands.filter((entry) => entry.name !== "revision");

describe("workstream CLI projection", () => {
  it("projects every service operation as a command", () => {
    expect(commands.map((entry) => entry.name)).toEqual([
      "open",
      "admit",
      "push",
      "resolve",
      "close",
      "inspect",
      "trace",
      "revision",
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

  it("lets every stream-scoped command address a candidate revision", () => {
    for (const { name, command } of streamScoped) {
      expect(Object.keys(command.flags), `${name} revision flag`).toContain("revision");
    }
  });

  it("accepts an ordered, repeatable boundary flag when opening a frame", () => {
    expect(WorkstreamOpen.flags.boundary.multiple).toBe(true);
    expect(WorkstreamOpen.flags.boundary.required).toBe(true);
  });

  it("exposes a temporal flag wherever the past can be reconstructed", () => {
    expect(WorkstreamInspect.flags.at).toBeDefined();
    expect(WorkstreamTrace.flags.at).toBeDefined();
  });

  it("records why on every durable decision that can carry a reason", () => {
    for (const command of [WorkstreamResolve, WorkstreamClose, WorkstreamRevision]) {
      expect(Object.keys(command.flags)).toContain("note");
    }
  });

  it("offers the whole revision lifecycle as one command", () => {
    expect(WorkstreamRevision.args.action.options).toEqual([
      "fork",
      "preview",
      "promote",
      "abandon",
      "list",
    ]);
  });

  it("defaults ledger selection without requiring flags", () => {
    expect(DEFAULT_LEDGER_URL).toBe("http://localhost:8090");
    expect(DEFAULT_LEDGER_NAME).toBe("workstream:main");
  });

  it("wraps invocation context in the envelope procedures expect", () => {
    expect(invocation("trace-1")).toEqual({ context: { invocation: { traceId: "trace-1" } } });
  });
});
