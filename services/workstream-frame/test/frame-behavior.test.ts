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
    const response = await fetch(`${FLUREE_URL}/health`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function clientFor(ledger: SemanticLedgerPort, ledgerName: string): Client {
  return createClient({
    deps: {
      ledger,
      clock: { now: () => "2026-07-25T00:00:00.000Z" },
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

describe.each([{ index: 0 }, { index: 1 }])("frame behaviour (harness $index)", ({ index }) => {
  const active = (): Harness | undefined => harnesses[index];

  it("advances an item only as far as its tags allow, then peels off the refusal", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );

    const pushed = await client.streams.push({ streamId: "s1" }, call);
    const advance = pushed.advances.find((entry) => entry.itemId === "a");

    expect(advance?.outcome).toBe("blocked");
    expect(advance?.clearedTo).toBe(1);
    expect(advance?.blockedAt).toBe(1);
    expect(advance?.requires).toBe("reviewed");
    expect(advance?.derivedItemId).toBe("a~needs-reviewed");
  });

  it("links the peeled-off item back to its cause and carries the tag it owes", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );
    await client.streams.push({ streamId: "s1" }, call);

    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    const derived = observed.stream.items.find((item) => item.id === "a~needs-reviewed");

    expect(derived).toBeDefined();
    expect(derived?.derivedFrom).toBe("a");
    expect(derived?.grants).toBe("reviewed");
    expect(derived?.resolved).toBe(false);
  });

  it("closes the loop: resolving a derived item carries its parent through", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );

    // Drive the loop to completion: push, resolve whatever was peeled off, repeat.
    let completed = false;
    for (let turn = 0; turn < 6 && !completed; turn += 1) {
      const pushed = await client.streams.push({ streamId: "s1" }, call);
      completed = pushed.advances.some(
        (entry) => entry.itemId === "a" && entry.outcome === "completed"
      );
      if (completed) break;

      const outstanding = pushed.advances.find(
        (entry) => entry.itemId === "a" && entry.derivedItemId !== null
      );
      if (outstanding?.derivedItemId) {
        await client.streams.resolve({ streamId: "s1", itemId: outstanding.derivedItemId }, call);
      }
    }

    expect(completed).toBe(true);

    const final = await client.streams.inspect({ streamId: "s1" }, call);
    const item = final.stream.items.find((entry) => entry.id === "a");
    expect(item?.position).toBe(BOUNDARIES.length);
    expect(item?.tags).toEqual(["reviewed", "specified", "verified"]);
  });

  it("terminates: driving the loop to completion stops peeling off forever", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );

    // Resolve everything the frame peels off, repeatedly, then keep pushing.
    // A derived item must not traverse the frame itself, or this never settles.
    for (let turn = 0; turn < 10; turn += 1) {
      const pushed = await client.streams.push({ streamId: "s1" }, call);
      if (pushed.atEquilibrium) break;
      for (const advance of pushed.advances) {
        if (advance.derivedItemId) {
          await client.streams.resolve({ streamId: "s1", itemId: advance.derivedItemId }, call);
        }
      }
    }

    const settled = await client.streams.push({ streamId: "s1" }, call);
    expect(settled.atEquilibrium).toBe(true);

    const final = await client.streams.inspect({ streamId: "s1" }, call);
    // Exactly one item plus one peel-off per boundary it could not clear.
    expect(final.stream.items.map((item) => item.id).sort()).toEqual([
      "a",
      "a~needs-reviewed",
      "a~needs-verified",
    ]);
    expect(final.stream.items.find((item) => item.id === "a")?.position).toBe(BOUNDARIES.length);
  });

  it("reaches equilibrium: a push that moves nothing says so", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call);
    await client.streams.admit(
      { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
      call
    );

    const first = await client.streams.push({ streamId: "s1" }, call);
    const second = await client.streams.push({ streamId: "s1" }, call);

    expect(first.atEquilibrium).toBe(false);
    expect(second.atEquilibrium).toBe(true);
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

    // The present has the item and its peel-off.
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
});
