/**
 * @fileoverview Behaviour suite for the work-stream frame.
 *
 * @remarks
 * The same suite runs against both providers. That is the point: if the service
 * behaves identically over an in-memory log and over a real Fluree server, then
 * the `semantic-ledger` contract is genuinely provider-neutral rather than a
 * thin wrapper shaped around one vendor.
 *
 * The Fluree pass is skipped when no server is reachable, so the suite stays
 * honest without becoming flaky. It is never silently replaced by the memory
 * pass — a skip is reported as a skip.
 */
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@rawr/hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@rawr/hq-sdk/host-adapters/logger/embedded-placeholder";
import type { SemanticLedgerPort } from "@rawr/resource-semantic-ledger";
import { createFlureeHttpSemanticLedgerPort } from "@rawr/resource-semantic-ledger/providers/fluree-http";
import { createMemorySemanticLedgerPort } from "@rawr/resource-semantic-ledger/providers/memory";
import { beforeAll, describe, expect, it } from "vitest";
import { type Client, createClient } from "../src/client";

const FLUREE_URL = process.env.FLUREE_URL ?? "http://localhost:8090";

/** The frame under test: three boundaries, each cleared by one tag. */
const BOUNDARIES = [{ requires: "specified" }, { requires: "reviewed" }, { requires: "verified" }];

async function flureeReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${FLUREE_URL}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

function clientFor(ledger: SemanticLedgerPort, ledgerName: string): Client {
  return createClient({
    deps: {
      ledger,
      clock: { now: () => new Date().toISOString() },
      logger: createEmbeddedPlaceholderLoggerAdapter(),
      analytics: createEmbeddedPlaceholderAnalyticsAdapter(),
    },
    scope: { ledgerName },
    config: { readOnly: false },
  });
}

/** Invocation context is supplied per call by the router client. */
const call = { context: { invocation: { traceId: "test-trace" } } };

interface Harness {
  readonly name: string;
  readonly makePort: () => SemanticLedgerPort;
  readonly ledgerName: () => string;
}

const harnesses: Harness[] = [
  {
    name: "memory provider",
    makePort: () => createMemorySemanticLedgerPort(),
    ledgerName: () => "workstream:main",
  },
];

let flureeUp = false;

beforeAll(async () => {
  flureeUp = await flureeReachable();
  if (flureeUp) {
    harnesses.push({
      name: "fluree-http provider",
      makePort: () => createFlureeHttpSemanticLedgerPort({ baseUrl: FLUREE_URL }),
      // A fresh ledger per run keeps runs independent without deleting data,
      // which an append-only substrate cannot do anyway.
      ledgerName: () => `wsfr${Date.now().toString(36)}:main`,
    });
  } else {
    console.warn(
      `[workstream-frame] Fluree not reachable at ${FLUREE_URL}; the fluree-http pass is SKIPPED, not substituted.`
    );
  }
});

/** Open a stream and admit one item carrying only the first tag. */
async function seeded(client: Client): Promise<void> {
  await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
  await client.streams.admit(
    { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
    call
  );
}

/** Push, resolve whatever was peeled off, repeat until settled. */
async function driveToSettled(client: Client, turns = 10): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    const pushed = await client.streams.push({ streamId: "s1" }, call);
    if (pushed.settlement !== "advancing") {
      const outstanding = pushed.advances.filter((entry) => entry.derivedItemId !== null);
      if (outstanding.length === 0) return;
      for (const advance of outstanding) {
        if (advance.derivedItemId) {
          await client.streams.resolve(
            { streamId: "s1", itemId: advance.derivedItemId, note: "answered by test" },
            call
          );
        }
      }
    }
  }
}

describe.each([{ index: 0 }, { index: 1 }])("frame behaviour (harness $index)", ({ index }) => {
  const active = (): Harness | undefined => harnesses[index];

  it("advances an item only as far as its tags allow, then peels off the refusal", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    const pushed = await client.streams.push({ streamId: "s1" }, call);
    const advance = pushed.advances.find((entry) => entry.itemId === "a");

    expect(advance?.outcome).toBe("blocked");
    expect(advance?.clearedTo).toBe(1);
    expect(advance?.requires).toBe("reviewed");
    expect(advance?.derivedItemId).toBe("a~needs-reviewed");
  });

  it("records clearance against the boundary's identity, not its index", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await client.streams.push({ streamId: "s1" }, call);

    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    const item = observed.stream.items.find((entry) => entry.id === "a");
    const first = observed.stream.boundaries[0];

    // The durable fact names the gate. An ordinal would have been ambiguous
    // the moment the frame changed shape.
    expect(first?.key).toBeTruthy();
    expect(item?.cleared).toEqual([first?.key]);
    expect(item?.position).toBe(1);
  });

  it("links the peeled-off item back to its cause and carries the tag it owes", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await client.streams.push({ streamId: "s1" }, call);

    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    const derived = observed.stream.items.find((item) => item.id === "a~needs-reviewed");

    expect(derived?.derivedFrom).toBe("a");
    expect(derived?.grants).toBe("reviewed");
    expect(derived?.resolved).toBe(false);
  });

  it("distinguishes stalled from converged", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    expect((await client.streams.push({ streamId: "s1" }, call)).settlement).toBe("advancing");

    // Nothing moves now, but the work is not done — someone owes an answer.
    expect((await client.streams.push({ streamId: "s1" }, call)).settlement).toBe("stalled");

    await driveToSettled(client);
    const settled = await client.streams.push({ streamId: "s1" }, call);
    expect(settled.settlement).toBe("converged");
  });

  it("closes the loop: resolving a derived item carries its parent through", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await driveToSettled(client);

    const final = await client.streams.inspect({ streamId: "s1" }, call);
    const item = final.stream.items.find((entry) => entry.id === "a");
    expect(item?.position).toBe(BOUNDARIES.length);
    expect(item?.tags).toEqual(["reviewed", "specified", "verified"]);
  });

  it("terminates: driving the loop to completion stops peeling off forever", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await driveToSettled(client);

    const final = await client.streams.inspect({ streamId: "s1" }, call);
    // Exactly one item plus one peel-off per boundary it could not clear.
    expect(final.stream.items.map((item) => item.id).sort()).toEqual([
      "a",
      "a~needs-reviewed",
      "a~needs-verified",
    ]);
  });

  it("traces how an item came to be where it is", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await driveToSettled(client);

    const traced = await client.streams.trace({ streamId: "s1", itemId: "a" }, call);
    const kinds = traced.events.map((event) => event.kind);

    expect(kinds).toContain("admitted");
    expect(kinds.filter((kind) => kind === "cleared")).toHaveLength(BOUNDARIES.length);
    expect(kinds.filter((kind) => kind === "peeled-off")).toHaveLength(2);

    // A resolution records why, not only that.
    const child = await client.streams.trace({ streamId: "s1", itemId: "a~needs-reviewed" }, call);
    const resolved = child.events.find((event) => event.kind === "resolved");
    expect(resolved?.note).toBe("answered by test");
  });

  it("reconstructs the past: the same query at two positions returns two worlds", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);

    const beforeAdmit = await client.streams.inspect({ streamId: "s1" }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );
    await client.streams.push({ streamId: "s1" }, call);
    const now = await client.streams.inspect({ streamId: "s1" }, call);

    expect(now.stream.items.map((item) => item.id).sort()).toEqual(["a", "a~needs-reviewed"]);

    // The past does not — and this is a real reconstruction, not a filter over
    // current rows, because nothing was ever mutated.
    const past = await client.streams.inspect({ streamId: "s1", at: beforeAdmit.observedAt }, call);
    expect(past.stream.items).toEqual([]);
    expect(past.observedAt).toBeLessThan(now.observedAt);
    expect(past.stream.boundaries).toHaveLength(BOUNDARIES.length);
  });

  it("refuses a position the ledger has not reached", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    const head = await client.streams.inspect({ streamId: "s1" }, call);

    await expect(
      client.streams.inspect({ streamId: "s1", at: head.head + 50 }, call)
    ).rejects.toMatchObject({ code: "STREAM_NOT_FOUND" });
  });

  it("seals a closed stream against writes but never against reads", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    const beforeClose = await client.streams.inspect({ streamId: "s1" }, call);

    const closed = await client.streams.close({ streamId: "s1", note: "scope delivered" }, call);
    expect(closed.closedAt).not.toBeNull();
    expect(closed.closedNote).toBe("scope delivered");

    await expect(client.streams.push({ streamId: "s1" }, call)).rejects.toMatchObject({
      code: "STREAM_CLOSED",
    });
    await expect(
      client.streams.admit({ streamId: "s1", itemId: "b", title: "Late" }, call)
    ).rejects.toMatchObject({ code: "STREAM_CLOSED" });

    // Reading still works, including into the past.
    const past = await client.streams.inspect({ streamId: "s1", at: beforeClose.observedAt }, call);
    expect(past.stream.closedAt).toBeNull();
  });

  it("isolates a candidate revision until it is promoted", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    await client.revisions.fork({ revision: "try" }, call);
    await client.streams.admit(
      { streamId: "s1", revision: "try", itemId: "b", title: "Speculative", tags: ["specified"] },
      call
    );

    // The candidate sees its own work; committed truth does not.
    const onCandidate = await client.streams.inspect({ streamId: "s1", revision: "try" }, call);
    const onCommitted = await client.streams.inspect({ streamId: "s1" }, call);
    expect(onCandidate.stream.items.map((item) => item.id)).toContain("b");
    expect(onCommitted.stream.items.map((item) => item.id)).not.toContain("b");

    const preview = await client.revisions.preview({ revision: "try" }, call);
    expect(preview.ahead).toBeGreaterThan(0);
    expect(preview.conflicts).toBe(0);

    const promoted = await client.revisions.promote({ revision: "try", note: "accepted" }, call);
    expect(promoted.conflicts).toBe(0);

    const afterPromote = await client.streams.inspect({ streamId: "s1" }, call);
    expect(afterPromote.stream.items.map((item) => item.id)).toContain("b");
  });

  it("records an abandoned revision instead of deleting it", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await client.revisions.fork({ revision: "dead-end" }, call);
    await client.revisions.abandon({ revision: "dead-end", note: "wrong approach" }, call);

    const listed = await client.revisions.list({}, call);
    const abandoned = listed.revisions.find((entry) => entry.revision === "dead-end");

    expect(abandoned?.status).toBe("abandoned");
    // Still readable. Superseded is a status, not an erasure.
    const stillThere = await client.streams.inspect({ streamId: "s1", revision: "dead-end" }, call);
    expect(stillThere.stream.streamId).toBe("s1");
  });

  it("refuses to promote or abandon the committed revision", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    await expect(client.revisions.promote({ revision: "main" }, call)).rejects.toMatchObject({
      code: "REVISION_NOT_CANDIDATE",
    });
    await expect(client.revisions.abandon({ revision: "main" }, call)).rejects.toMatchObject({
      code: "REVISION_NOT_CANDIDATE",
    });
  });
});
