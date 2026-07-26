/**
 * @fileoverview Conformance suite for the semantic-ledger contract.
 *
 * @remarks
 * One scenario array runs against every provider. A capability that only one
 * substrate honours is not a capability the contract declares, so a scenario
 * that cannot be written to hold on both belongs in neither.
 *
 * The Fluree pass is skipped when no server is reachable, and it is never
 * silently replaced by the memory pass — a skip is reported as a skip. Memory
 * is single-threaded, so the contention scenarios establish what the
 * precondition *means* there and what it *excludes* on Fluree. Neither result
 * substitutes for the other and both are required: semantics without exclusion
 * is untested under a race, and exclusion without semantics is one vendor's
 * behaviour rather than the contract's.
 *
 * A handful of scenarios address the Fluree server directly, with no adapter in
 * between. Those are controls: a refusal the adapter reports is only evidence
 * once the identical statements are shown to apply when their precondition is
 * struck out, and the identity a flake-less transaction reports is only a sound
 * discriminator once it is derived rather than assumed.
 */
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type GraphNode,
  type LedgerApplied,
  type LedgerReceipt,
  type LedgerRefused,
  type SemanticLedgerPort,
  term,
  type WriteGuard,
} from "../contract";
import { createFlureeHttpSemanticLedgerPort } from "../providers/fluree-http";
import { createMemorySemanticLedgerPort } from "../providers/memory";

const FLUREE_URL = process.env.FLUREE_URL ?? "http://localhost:8090";

/** Vocabulary these scenarios assert facts in. It means nothing beyond this file. */
const NS = "https://rawr.dev/semantic-ledger/conformance#";
const KIND = `${NS}kind`;
const VALUE = `${NS}value`;

/** Writers contending for one single-valued fact. */
const CLAIMANTS = 20;

/** Rounds of contention, because exclusion holding once is consistent with luck. */
const ROUNDS = 3;

/** RFC 4648 base32, lowercase and unpadded — what the multibase prefix `b` names. */
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * The commit identity Fluree reports for a transaction that produced no flakes.
 *
 * @remarks
 * It is a sentinel and never a commit, so no receipt may carry it. Naming it
 * here is what lets every scenario's receipts be swept for it.
 */
const FLAKELESS_COMMIT_ID = "bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi";

function base32(bytes: Uint8Array): string {
  let encoded = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32_ALPHABET.charAt((buffer >> bits) & 0b11111);
    }
  }
  return bits === 0 ? encoded : encoded + BASE32_ALPHABET.charAt((buffer << (5 - bits)) & 0b11111);
}

/**
 * `CIDv1(ContentKind::Commit, sha256(""))`, derived from its parts.
 *
 * @remarks
 * A constant compared against itself establishes nothing. Deriving the identity
 * and holding the substrate's own answer to it is what makes the discriminator
 * every write depends on falsifiable: a content tag that moves fails here,
 * loudly, rather than turning every later refusal into a reported success.
 */
function deriveFlakelessCommitId(): string {
  const header = [0x01, 0x81, 0x80, 0xc0, 0x01, 0x12, 0x20];
  const digest = createHash("sha256").update(new Uint8Array()).digest();
  return `b${base32(Uint8Array.from([...header, ...digest]))}`;
}

async function flureeReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${FLUREE_URL}/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

const iri = (name: string): string => `${NS}${name}`;

/** One subject carrying a kind and a value, which is every fact these scenarios write. */
function claim(name: string, value: string): GraphNode {
  return {
    id: iri(name),
    properties: [
      { predicate: KIND, object: term.literal("Claim") },
      { predicate: VALUE, object: term.literal(value) },
    ],
  };
}

/** The same two statements, as SPARQL, for the scenarios that bypass the adapter. */
function statements(name: string, value: string): string {
  return `  <${iri(name)}> <${KIND}> "Claim" .\n  <${iri(name)}> <${VALUE}> "${value}" .`;
}

/** The precondition that makes a claim single-valued: nobody has claimed the subject. */
function unclaimed(name: string): WriteGuard {
  return { kind: "conditional", requires: [], absent: [{ subject: iri(name), predicate: KIND }] };
}

/** Every value recorded against one subject. */
async function valuesOf(
  port: SemanticLedgerPort,
  ledger: string,
  name: string
): Promise<readonly string[]> {
  const rows = await port.select({
    ledger,
    query: {
      select: ["value"],
      where: [
        { subject: term.iri(iri(name)), predicate: term.iri(VALUE), object: term.var("value") },
      ],
    },
  });
  return rows.flatMap((row) => (row.value === undefined ? [] : [row.value]));
}

/** Every receipt the suite has been given, kept so the sentinel can be swept for. */
const observed: LedgerReceipt[] = [];

type Offer = Parameters<SemanticLedgerPort["propose"]>[0];

/**
 * Offer facts, holding the receipt to the rule that a sentinel is not a value.
 *
 * @remarks
 * The check happens where the receipt is produced rather than at the end, so a
 * leak names the scenario that leaked it.
 */
async function offer(port: SemanticLedgerPort, input: Offer): Promise<LedgerReceipt> {
  const receipt = await port.propose(input);
  expect(JSON.stringify(receipt)).not.toContain(FLAKELESS_COMMIT_ID);
  observed.push(receipt);
  return receipt;
}

/** Narrow a receipt to the application it is asserted to be. */
function application(receipt: LedgerReceipt): LedgerApplied {
  if (!receipt.applied) {
    throw new Error(`Expected an application, received ${receipt.reason} at t=${receipt.t}`);
  }
  return receipt;
}

/** Narrow a receipt to the refusal it is asserted to be. */
function refusal(receipt: LedgerReceipt): LedgerRefused {
  if (receipt.applied) {
    throw new Error(`Expected a refusal, received a commit at t=${receipt.t}`);
  }
  return receipt;
}

/**
 * Send one update at the Fluree server with no adapter in between.
 *
 * @remarks
 * The controls need statements the adapter would never emit — a proposal with
 * its precondition struck out — so they are written by hand and read by hand.
 */
async function updateDirectly(
  ledger: string,
  sparql: string
): Promise<{ status: number; t: number; hash: string }> {
  const response = await fetch(
    `${FLUREE_URL}/v1/fluree/update?ledger=${encodeURIComponent(ledger)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/sparql-update" },
      body: sparql,
    }
  );
  const body = (await response.json()) as { t?: number; commit?: { hash?: string } };
  return { status: response.status, t: body.t ?? 0, hash: body.commit?.hash ?? "" };
}

/**
 * A transport that performs every request and loses the answer to one route.
 *
 * @remarks
 * This is the window an identity exists to close, and it is the only shape that
 * reproduces it: the write reaches the substrate and the caller is left unable
 * to tell whether it did. A transport that failed before sending would leave
 * nothing to recover and would prove nothing.
 */
function losesAnswersTo(route: string): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await globalThis.fetch(input, init);
    const target = input instanceof Request ? input.url : String(input);
    if (!target.includes(route)) return response;
    await response.text();
    throw new TypeError(`Answer to ${route} lost`);
  };
}

interface Harness {
  readonly name: string;
  readonly makePort: () => SemanticLedgerPort;
  readonly ledgerName: () => string;
}

let sequence = 0;

/** A line no scenario shares, so none observes another's facts. */
function nextLine(prefix: string): string {
  sequence += 1;
  return `${prefix}${sequence.toString(36)}:main`;
}

const harnesses: Harness[] = [
  {
    name: "memory provider",
    makePort: () => createMemorySemanticLedgerPort(),
    ledgerName: () => nextLine("conformance"),
  },
];

let flureeUp = false;

beforeAll(async () => {
  flureeUp = await flureeReachable();
  if (flureeUp) {
    harnesses.push({
      name: "fluree-http provider",
      makePort: () => createFlureeHttpSemanticLedgerPort({ baseUrl: FLUREE_URL }),
      // Fresh lines per run keep runs independent without deleting data, which
      // an append-only substrate cannot do anyway.
      ledgerName: () => nextLine(`lcnf${Date.now().toString(36)}`),
    });
  } else {
    console.warn(
      `[semantic-ledger] Fluree not reachable at ${FLUREE_URL}; the fluree-http pass is SKIPPED, not substituted.`
    );
  }
});

/** A port and one line of its own, which is what every scenario starts from. */
async function opened(harness: Harness): Promise<{ port: SemanticLedgerPort; ledger: string }> {
  const port = harness.makePort();
  const ledger = harness.ledgerName();
  await port.ensureLedger({ ledger });
  return { port, ledger };
}

describe.each([{ index: 0 }, { index: 1 }])("ledger conformance (harness $index)", ({ index }) => {
  const active = (): Harness | undefined => harnesses[index];

  it("evaluates the precondition rather than carrying it", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const guard = unclaimed("evaluated");
    const nodes = [claim("evaluated", "first")];

    // The same offer twice over. The first time the subject is unclaimed and the
    // second time it is not, so identical bytes must produce opposite outcomes.
    const applied = application(await offer(port, { ledger, identity: "eval-1", guard, nodes }));
    const refused = refusal(await offer(port, { ledger, identity: "eval-2", guard, nodes }));

    expect(refused.reason).toBe("GuardUnmatched");
    expect(applied.commit).not.toBe("");
    expect(await valuesOf(port, ledger, "evaluated")).toEqual(["first"]);
  });

  it("writes nothing when it refuses, and the refusal is observable", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    application(
      await offer(port, {
        ledger,
        identity: "silent-seed",
        guard: unclaimed("silent"),
        nodes: [claim("silent", "seed")],
      })
    );
    const before = await port.head({ ledger });

    // The facts offered name a subject nothing else touches, so their absence
    // afterwards is the refusal itself rather than a coincidence of overwriting.
    const refused = refusal(
      await offer(port, {
        ledger,
        identity: "silent-blocked",
        guard: unclaimed("silent"),
        nodes: [claim("silent-mark", "never")],
      })
    );

    expect(refused.reason).toBe("GuardUnmatched");
    expect((await port.head({ ledger })).t).toBe(before.t);
    expect(await valuesOf(port, ledger, "silent-mark")).toEqual([]);
  });

  it("reports a position that cannot discriminate an outcome", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    application(
      await offer(port, {
        ledger,
        identity: "position-seed",
        guard: unclaimed("position"),
        nodes: [claim("position", "seed")],
      })
    );
    const before = await port.head({ ledger });

    // Someone else commits between the reading and the offer. That is all a
    // position ever reports, and it reports it to every writer alike.
    application(
      await offer(port, {
        ledger,
        identity: "position-other",
        guard: unclaimed("position-other"),
        nodes: [claim("position-other", "elsewhere")],
      })
    );

    const refused = refusal(
      await offer(port, {
        ledger,
        identity: "position-blocked",
        guard: unclaimed("position"),
        nodes: [claim("position-mark", "never")],
      })
    );

    expect(refused.t).toBeGreaterThan(before.t);
    expect(await valuesOf(port, ledger, "position-mark")).toEqual([]);
  });

  it("admits exactly one of many claims to one subject", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    for (let round = 0; round < ROUNDS; round += 1) {
      const name = `contended-${round}`;
      const receipts = await Promise.all(
        Array.from({ length: CLAIMANTS }, (_entry, writer) =>
          offer(port, {
            ledger,
            identity: `${name}-${writer}`,
            guard: unclaimed(name),
            nodes: [claim(name, `writer-${writer}`)],
          })
        )
      );

      expect(receipts.filter((receipt) => receipt.applied)).toHaveLength(1);
      expect(receipts.filter((receipt) => !receipt.applied)).toHaveLength(CLAIMANTS - 1);
      expect(await valuesOf(port, ledger, name)).toHaveLength(1);
    }
  });

  it("lets every writer through when nothing is required of the world", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const receipts = await Promise.all(
      Array.from({ length: CLAIMANTS }, (_entry, writer) =>
        offer(port, {
          ledger,
          identity: `unguarded-${writer}`,
          guard: { kind: "unconditional" },
          nodes: [claim("unguarded", `writer-${writer}`)],
        })
      )
    );

    // Every claimant is told it succeeded and the subject ends up holding every
    // answer at once. Without this the winning side proves nothing.
    expect(receipts.filter((receipt) => receipt.applied)).toHaveLength(CLAIMANTS);
    expect(new Set(await valuesOf(port, ledger, "unguarded")).size).toBe(CLAIMANTS);
  });

  it("applies one identity at most once", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const guard = unclaimed("once");
    const nodes = [claim("once", "held")];

    const first = await offer(port, { ledger, identity: "once", guard, nodes });
    const again = await offer(port, { ledger, identity: "once", guard, nodes });

    expect(application(first).commit).not.toBe("");
    expect(again).toEqual(first);
    expect(await valuesOf(port, ledger, "once")).toEqual(["held"]);
  });

  it("treats two identities offering one content as two offers", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const guard: WriteGuard = { kind: "unconditional" };
    const nodes = [claim("twice", "held")];

    const first = application(await offer(port, { ledger, identity: "twice-a", guard, nodes }));
    const second = application(await offer(port, { ledger, identity: "twice-b", guard, nodes }));

    expect(second.t).toBeGreaterThan(first.t);
  });

  it("refuses a taken identity offered different facts", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    application(
      await offer(port, {
        ledger,
        identity: "taken",
        guard: unclaimed("taken"),
        nodes: [claim("taken", "first")],
      })
    );

    const refused = refusal(
      await offer(port, {
        ledger,
        identity: "taken",
        guard: unclaimed("taken-other"),
        nodes: [claim("taken-other", "second")],
      })
    );

    expect(refused.reason).toBe("AlreadyProposed");
    expect(await valuesOf(port, ledger, "taken-other")).toEqual([]);
  });

  it("scopes an identity to the line it was offered on", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const port = harness.makePort();
    const here = harness.ledgerName();
    const there = harness.ledgerName();
    await port.ensureLedger({ ledger: here });
    await port.ensureLedger({ ledger: there });

    const guard = unclaimed("scoped");
    const nodes = [claim("scoped", "held")];

    application(await offer(port, { ledger: here, identity: "scoped", guard, nodes }));
    application(await offer(port, { ledger: there, identity: "scoped", guard, nodes }));

    expect(await valuesOf(port, here, "scoped")).toEqual(["held"]);
    expect(await valuesOf(port, there, "scoped")).toEqual(["held"]);
  });

  it("gives a refusal nowhere to name a commit", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const guard = unclaimed("nameless");
    const nodes = [claim("nameless", "held")];

    application(await offer(port, { ledger, identity: "nameless-1", guard, nodes }));
    const refused = refusal(await offer(port, { ledger, identity: "nameless-2", guard, nodes }));

    // @ts-expect-error A refusal has no commit, so a substrate's sentinel has no position to occupy.
    expect(refused.commit).toBeUndefined();
  });
});

describe("the Fluree substrate", () => {
  const active = (): Harness | undefined => (flureeUp ? harnesses[1] : undefined);

  it("refuses by evaluating, not by failing to be read", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    const guard = unclaimed("control");
    const nodes = [claim("control", "first")];

    application(await offer(port, { ledger, identity: "control-1", guard, nodes }));
    refusal(await offer(port, { ledger, identity: "control-2", guard, nodes }));

    // The identical statements with the precondition struck out, sent straight
    // at the server: they apply. So the refusal above is an evaluation the
    // substrate performed, not a request it declined to understand.
    const unguarded = await updateDirectly(
      ledger,
      `INSERT DATA {\n${statements("control", "first")}\n}`
    );

    expect(unguarded.status).toBe(200);
    expect(unguarded.hash).not.toBe(FLAKELESS_COMMIT_ID);
  });

  it("reports the identity a flake-less transaction derives to", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const { port, ledger } = await opened(harness);
    application(
      await offer(port, {
        ledger,
        identity: "derived-1",
        guard: unclaimed("derived"),
        nodes: [claim("derived", "held")],
      })
    );

    // Straight at the server, so the identity under test is the one it returns
    // rather than one the adapter chose to report.
    const refused = await updateDirectly(
      ledger,
      [
        `INSERT {\n${statements("derived", "held")}\n}`,
        `WHERE {\n  FILTER NOT EXISTS { <${iri("derived")}> <${KIND}> ?a0 }\n}`,
      ].join("\n")
    );

    expect(refused.hash).toBe(deriveFlakelessCommitId());
    expect(refused.hash).toBe(FLAKELESS_COMMIT_ID);
  });

  it("resolves an offer whose answer never arrived", async ({ skip }) => {
    const harness = active();
    if (!harness) return skip("provider not available");

    const ledger = harness.ledgerName();
    await createFlureeHttpSemanticLedgerPort({ baseUrl: FLUREE_URL }).ensureLedger({ ledger });

    const port = createFlureeHttpSemanticLedgerPort({
      baseUrl: FLUREE_URL,
      fetch: losesAnswersTo("/update"),
    });
    const guard = unclaimed("lost");
    const nodes = [claim("lost", "held")];

    // Every answer on the write route is discarded, so a receipt at all can only
    // have come from the record the identity left behind.
    const applied = application(await offer(port, { ledger, identity: "lost-1", guard, nodes }));
    expect(applied.commit).not.toBe("");
    // Resending an offer under one identity is what makes a lost answer safe to
    // chase, and it is only safe if the resend writes nothing a second time.
    expect(await valuesOf(port, ledger, "lost")).toEqual(["held"]);

    // A recovered outcome is the true one, including when the true one is that
    // nothing happened.
    const refused = refusal(await offer(port, { ledger, identity: "lost-2", guard, nodes }));
    expect(refused.reason).toBe("GuardUnmatched");
    expect(await valuesOf(port, ledger, "lost")).toEqual(["held"]);
  });
});

describe("the flake-less commit identity", () => {
  it("reaches no caller", () => {
    expect(observed.length).toBeGreaterThan(0);
    expect(
      observed.filter((receipt) => JSON.stringify(receipt).includes(FLAKELESS_COMMIT_ID))
    ).toEqual([]);
  });
});
