/**
 * @fileoverview Concurrency suite for the work-stream frame.
 *
 * @remarks
 * Every scenario offers two writes for one decision and asserts on what
 * survives: the settled outcome of each racer, and the state re-read
 * afterwards. Both racers always run to completion — a refusal is an outcome to
 * be observed, not a reason to abandon its partner — and no assertion names
 * which of them won, because that is the substrate's business and not the
 * frame's.
 *
 * The same suite runs against both providers, and each proves a different half.
 * The memory harness is single-threaded: its racers interleave at await points
 * inside one thread, so what it establishes is the *semantics* — a decision
 * offered against state that another decision has already changed is refused
 * rather than absorbed. Fluree runs the racers as genuinely simultaneous
 * requests against one server, so what it establishes is *exclusion*. Neither
 * substitutes for the other, which is why the Fluree pass is reported as a skip
 * rather than quietly replaced by the memory pass when no server is reachable.
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

/** A frame with one gate, so a push either clears it or does nothing at all. */
const SINGLE_BOUNDARY = [{ requires: "specified" }];

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
      ledgerName: () => `wsfc${Date.now().toString(36)}:main`,
    });
  } else {
    console.warn(
      `[workstream-frame] Fluree not reachable at ${FLUREE_URL}; the fluree-http pass is SKIPPED, not substituted.`
    );
  }
});

/** The values of the racers that returned. */
function returned<Value>(settled: readonly PromiseSettledResult<Value>[]): Value[] {
  return settled.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
}

/** The errors of the racers that raised. */
function raised(settled: readonly PromiseSettledResult<unknown>[]): unknown[] {
  return settled.flatMap((outcome) => (outcome.status === "rejected" ? [outcome.reason] : []));
}

/** Declare the frame under test. */
async function opened(client: Client, boundaries = BOUNDARIES): Promise<void> {
  await client.streams.open({ streamId: "s1", boundaries }, call);
}

/** Declare the frame and admit one item carrying only the first tag. */
async function seeded(client: Client, boundaries = BOUNDARIES): Promise<void> {
  await opened(client, boundaries);
  await client.streams.admit(
    { streamId: "s1", itemId: "a", title: "Ship the thing", tags: ["specified"] },
    call
  );
}

/**
 * The line's position, read through the frame.
 *
 * @remarks
 * One decision is one position. Comparing this either side of a race counts the
 * writes the frame made without asking any provider what it did.
 */
async function positionOf(client: Client): Promise<number> {
  return (await client.streams.inspect({ streamId: "s1" }, call)).head;
}

/** The earliest position at which one item is observable. */
async function admittedAt(client: Client, itemId: string): Promise<number> {
  const head = await positionOf(client);
  for (let position = 1; position <= head; position += 1) {
    const observed = await client.streams.inspect({ streamId: "s1", at: position }, call);
    if (observed.stream.items.some((item) => item.id === itemId)) return position;
  }
  return head;
}

describe.each([{ index: 0 }, { index: 1 }])("frame concurrency (harness $index)", ({ index }) => {
  const active = (): Harness | undefined => harnesses[index];

  it("declares a frame once when two callers declare it at the same time", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());

    const settled = await Promise.allSettled([
      client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call),
      client.streams.open({ streamId: "s1", boundaries: BOUNDARIES }, call),
    ]);

    expect(returned(settled)).toHaveLength(1);
    const refused = raised(settled);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ code: "STREAM_ALREADY_EXISTS" });

    // One frame, not two overlaid: a second shape on the same subjects leaves
    // the gate order at the mercy of whichever row a provider returns first.
    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    expect(observed.stream.boundaries).toHaveLength(BOUNDARIES.length);
    expect(observed.stream.boundaries.map((boundary) => boundary.requires)).toEqual(
      BOUNDARIES.map((boundary) => boundary.requires)
    );
  });

  it("admits an item once when two callers admit it at the same time", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await opened(client);
    const before = await positionOf(client);

    const settled = await Promise.allSettled([
      client.streams.admit({ streamId: "s1", itemId: "x", title: "First reading" }, call),
      client.streams.admit({ streamId: "s1", itemId: "x", title: "Second reading" }, call),
    ]);

    const answered = returned(settled);
    expect(answered).toHaveLength(1);
    const refused = raised(settled);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ code: "ITEM_ALREADY_EXISTS" });

    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    const admitted = observed.stream.items.filter((item) => item.id === "x");
    expect(admitted).toHaveLength(1);
    expect(admitted[0]?.title).toBe(answered[0]?.title);

    // One admission is one position, so a second admission time cannot exist
    // without the line having advanced twice.
    expect(observed.head).toBe(before + 1);
  });

  it("never admits an item into a stream that has closed", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    // Sealing is offered first, so an admission that still lands did so on the
    // strength of a reading the closure had already overtaken.
    const [sealed, admitted] = await Promise.allSettled([
      client.streams.close({ streamId: "s1", note: "scope delivered" }, call),
      client.streams.admit({ streamId: "s1", itemId: "b", title: "Late" }, call),
    ]);

    expect(sealed.status).toBe("fulfilled");
    if (admitted.status === "rejected") {
      expect(admitted.reason).toMatchObject({ code: "STREAM_CLOSED" });
      return;
    }

    // The other admissible answer: the item is in the stream, and the stream
    // was open at the position the item became observable.
    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    expect(observed.stream.items.map((item) => item.id)).toContain("b");

    const past = await client.streams.inspect(
      { streamId: "s1", at: await admittedAt(client, "b") },
      call
    );
    expect(past.stream.closedAt).toBeNull();
  });

  it("closes a stream once when two callers close it at the same time", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    const before = await positionOf(client);

    const settled = await Promise.allSettled([
      client.streams.close({ streamId: "s1", note: "scope delivered" }, call),
      client.streams.close({ streamId: "s1", note: "abandoned instead" }, call),
    ]);

    const sealed = returned(settled);
    expect(sealed).toHaveLength(1);
    const refused = raised(settled);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ code: "STREAM_CLOSED" });

    // A stream closes at one time for one reason. Two closure facts on one
    // subject leave both answers standing and neither of them true.
    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    expect(observed.head).toBe(before + 1);
    expect(observed.stream.closedAt).toBe(sealed[0]?.closedAt);
    expect(observed.stream.closedNote).toBe(sealed[0]?.closedNote);
  });

  it("reports one advance for one clearance", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client, SINGLE_BOUNDARY);
    const before = await positionOf(client);

    const settled = await Promise.allSettled([
      client.streams.push({ streamId: "s1" }, call),
      client.streams.push({ streamId: "s1" }, call),
    ]);

    expect(raised(settled)).toHaveLength(0);

    // One clearance, not two: the boundary is cleared once however many callers
    // push at once.
    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    expect(observed.head).toBe(before + 1);
    expect(observed.stream.items.find((item) => item.id === "a")?.position).toBe(
      SINGLE_BOUNDARY.length
    );

    // `settlement` is the field an agent drives the loop on, and what it must
    // never do is claim movement that did not happen. Two callers pushing at
    // once make the *same* proposal — same facts, same identity — so a substrate
    // that answers a repeated proposal with its first outcome tells both of them
    // the clearance was applied. It was. Neither is misinformed, and no provider
    // can separate "I applied this" from "this was applied under this identity"
    // without inventing a distinction the record does not contain.
    //
    // So the guarantee is directional: advancing implies the ledger moved.
    const settlements = returned(settled).map((pushed) => pushed.settlement);
    expect(settlements.filter((settlement) => settlement === "advancing").length).toBeGreaterThan(
      0
    );

    // And it is not stuck true. Once the frame has nowhere left to go, a further
    // push reports converged — which is what makes the loop terminate rather
    // than merely slow down.
    const again = await client.streams.push({ streamId: "s1" }, call);
    expect(again.settlement).toBe("converged");
    expect((await client.streams.inspect({ streamId: "s1" }, call)).head).toBe(observed.head);
  });

  it("resolves a derived item once when two callers resolve it at the same time", async ({
    skip,
  }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);
    await client.streams.push({ streamId: "s1" }, call);
    const before = await positionOf(client);

    const settled = await Promise.allSettled([
      client.streams.resolve({ streamId: "s1", itemId: "a~needs-reviewed", note: "first" }, call),
      client.streams.resolve({ streamId: "s1", itemId: "a~needs-reviewed", note: "second" }, call),
    ]);

    // Resolving something already resolved is a no-op, so both callers are
    // answered; only one of them may write.
    expect(raised(settled)).toHaveLength(0);
    for (const item of returned(settled)) {
      expect(item.id).toBe("a~needs-reviewed");
      expect(item.resolved).toBe(true);
    }

    const observed = await client.streams.inspect({ streamId: "s1" }, call);
    expect(observed.head).toBe(before + 1);

    const parent = observed.stream.items.find((item) => item.id === "a");
    expect(parent?.tags.filter((tag) => tag === "reviewed")).toHaveLength(1);

    const traced = await client.streams.trace({ streamId: "s1", itemId: "a~needs-reviewed" }, call);
    expect(traced.events.filter((event) => event.kind === "resolved")).toHaveLength(1);
  });

  it("refuses to abandon a revision it has already promoted", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const client = clientFor(harness.makePort(), harness.ledgerName());
    await seeded(client);

    await client.revisions.fork({ revision: "try" }, call);
    await client.streams.admit(
      { streamId: "s1", revision: "try", itemId: "b", title: "Speculative", tags: ["specified"] },
      call
    );
    await client.revisions.promote({ revision: "try", note: "accepted" }, call);
    const decided = await positionOf(client);

    await expect(
      client.revisions.abandon({ revision: "try", note: "changed my mind" }, call)
    ).rejects.toMatchObject({ code: "REVISION_NOT_CANDIDATE" });

    // A candidate is decided once. A second disposition would not replace the
    // first — both would stand, and which one answered would be a row order.
    const listed = await client.revisions.list({}, call);
    const candidate = listed.revisions.filter((entry) => entry.revision === "try");
    expect(candidate).toHaveLength(1);
    expect(candidate[0]?.status).toBe("promoted");
    expect(await positionOf(client)).toBe(decided);
  });
});
