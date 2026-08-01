import { describe, expect, test, vi } from "vitest";

import { FlureeClient, FlureeHttpError, type JsonObject } from "../../fluree-client";

describe("Fluree HTTP transport", () => {
  test("carries operation cancellation through every HTTP request", async () => {
    const controller = new AbortController();
    const signals: Array<AbortSignal | null | undefined> = [];
    const client = new FlureeClient({
      ledger: "example:main",
      signal: controller.signal,
      fetch: async (_input, init) => {
        signals.push(init?.signal);
        return new Response(JSON.stringify({ ok: true }));
      },
    });

    await client.health();
    await client.query({ from: client.ledger, select: ["*"] });

    expect(signals).toEqual([controller.signal, controller.signal]);
  });

  test("uses the external 4.1.4 API root and canonical ledger identity", async () => {
    const requests: { body?: string; headers: Headers; url: string }[] = [];
    const client = new FlureeClient({
      ledger: "example/history",
      fetch: async (input, init) => {
        requests.push({
          url: String(input),
          headers: new Headers(init?.headers),
          ...(typeof init?.body === "string" ? { body: init.body } : {}),
        });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    await client.createLedger();
    await client.query({ from: client.ledger, select: ["?value"], where: [] });
    await client.insert(
      { "@id": "urn:test:subject", "@type": "urn:test:Type" },
      { graph: "urn:test:graph" }
    );
    const reviewedFacts = {
      "@context": { id: "https://example.test/id/" },
      "@graph": [{ "@id": "id:fact", "@type": "urn:test:ReviewedFact" }],
    } satisfies JsonObject;
    await client.upsertJsonLd(reviewedFacts);

    expect(client.access).toBe("write");
    expect(client.ledger).toBe("example/history:main");
    expect(requests.map((request) => request.url)).toEqual([
      "http://127.0.0.1:8091/v1/fluree/create",
      "http://127.0.0.1:8091/v1/fluree/query",
      "http://127.0.0.1:8091/v1/fluree/insert?ledger=example%2Fhistory%3Amain",
      "http://127.0.0.1:8091/v1/fluree/upsert?ledger=example%2Fhistory%3Amain",
    ]);
    expect(JSON.parse(requests[0].body ?? "")).toEqual({
      ledger: "example/history",
    });
    const inserted = JSON.parse(requests[2].body ?? "") as JsonObject;
    expect(inserted["@graph"]).toEqual([
      {
        "@id": "urn:test:subject",
        "@type": "urn:test:Type",
        "@graph": "urn:test:graph",
      },
    ]);
    expect(JSON.parse(requests[3].body ?? "")).toEqual(reviewedFacts);
  });

  test("keeps direct clients writable by default but refuses every mutation in read mode", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const client = new FlureeClient({
      access: "read",
      ledger: "example:main",
      fetch,
    });

    await expect(
      client.query({ from: client.ledger, reasoning: "none", select: ["*"] })
    ).resolves.toEqual({ ok: true });
    fetch.mockClear();

    const mutableView = client as { access: "read" | "write" };
    expect(() => {
      mutableView.access = "write";
    }).toThrow(TypeError);
    expect(client.access).toBe("read");

    const mutations: readonly (() => Promise<unknown>)[] = [
      () => client.createLedger(),
      () => client.dropLedger(),
      () => client.insert([]),
      () => client.upsert({ "@id": "urn:test:upsert" }),
      () =>
        client.updateGraph({
          graph: "urn:test:graph",
          insert: [{ "@id": "urn:test:update" }],
        }),
      () => client.upsertJsonLd({ "@id": "urn:test:jsonld" }),
      () => client.upsertTrig("<urn:test:s> <urn:test:p> <urn:test:o> ."),
      () => client.upsertTurtle("<urn:test:s> <urn:test:p> <urn:test:o> ."),
    ];

    for (const mutate of mutations) {
      await expect(mutate()).rejects.toThrow(/requires write access/u);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  test("restricts every read-capability query to explicit reasoning none", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    const client = new FlureeClient({
      access: "read",
      ledger: "example:main",
      fetch,
    });

    await expect(client.query({ from: client.ledger, select: ["*"] })).rejects.toThrow(
      /require reasoning 'none'/u
    );
    await expect(
      client.query({ from: client.ledger, reasoning: "datalog", select: ["*"] })
    ).rejects.toThrow(/require reasoning 'none'/u);
    await expect(
      client.query({
        from: client.ledger,
        reasoning: "none",
        rules: [{ "@id": "urn:test:rule" }],
        select: ["*"],
      })
    ).rejects.toThrow(/must not supply rules/u);
    await expect(
      client.query({
        from: client.ledger,
        reasoning: "none",
        select: ["?rule"],
        where: { "https://example.test/rules": "?rule" },
      })
    ).resolves.toEqual({ ok: true });
    await expect(client.sparql("SELECT * WHERE {}")).rejects.toThrow(/exactly one reasoning:none/u);
    await expect(
      client.sparql("# PRAGMA reasoning: none\n# PRAGMA reasoning: datalog\nSELECT * WHERE {}")
    ).rejects.toThrow(/exactly one reasoning:none/u);
    await expect(client.sparql("# PRAGMA reasoning: none\nSELECT * WHERE {}")).resolves.toEqual({
      ok: true,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("validates and sends the same serialized read snapshot", async () => {
    const bodies: string[] = [];
    const fetch = vi.fn(async (_input, init) => {
      if (typeof init?.body === "string") bodies.push(init.body);
      return new Response(JSON.stringify({ ok: true }));
    });
    const client = new FlureeClient({
      access: "read",
      ledger: "example:main",
      fetch,
    });
    const body: JsonObject = {
      from: client.ledger,
      reasoning: "none",
      select: ["*"],
    };
    Object.defineProperty(body, "toJSON", {
      enumerable: false,
      value: () => ({
        reasoning: "datalog",
        rules: [{ insert: {}, where: {} }],
        select: ["*"],
      }),
    });

    await expect(client.query(body)).rejects.toThrow(/require reasoning 'none'/u);
    expect(fetch).not.toHaveBeenCalled();
    expect(bodies).toEqual([]);
  });

  test("posts one exact tracked atomic named-graph update", async () => {
    let request: { body?: string; headers: Headers; method?: string; url: string } | undefined;
    const client = new FlureeClient({
      ledger: "example/history",
      fetch: async (input, init) => {
        request = {
          url: String(input),
          headers: new Headers(init?.headers),
          ...(init?.method === undefined ? {} : { method: init.method }),
          ...(typeof init?.body === "string" ? { body: init.body } : {}),
        };
        return new Response(JSON.stringify({ result: { updated: true } }), {
          headers: {
            "x-fdb-reasoning": JSON.stringify({ capped: false }),
            "x-fluree-commit": "fluree:commit:sha256:update",
            "x-fluree-t": "11",
          },
        });
      },
    });

    await expect(
      client.updateGraph({
        context: { ex: "https://example.test/" },
        graph: "urn:test:graph",
        delete: [{ "@id": "ex:fact", "ex:status": "stale" }],
        insert: [{ "@id": "ex:fact", "ex:status": "current" }],
        tracked: true,
      })
    ).resolves.toEqual({
      result: { updated: true },
      reasoning: { capped: false },
      commit: "fluree:commit:sha256:update",
      t: 11,
    });

    expect(request?.url).toBe(
      "http://127.0.0.1:8091/v1/fluree/update?ledger=example%2Fhistory%3Amain"
    );
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    expect(request?.headers.get("fluree-track-meta")).toBe("true");
    expect(JSON.parse(request?.body ?? "")).toEqual({
      "@context": { ex: "https://example.test/" },
      graph: "urn:test:graph",
      delete: [{ "@id": "ex:fact", "ex:status": "stale" }],
      insert: [{ "@id": "ex:fact", "ex:status": "current" }],
    });
  });

  test("omits empty clauses and refuses a clause-free graph update", async () => {
    const bodies: string[] = [];
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async (_input, init) => {
        if (typeof init?.body === "string") bodies.push(init.body);
        return new Response(JSON.stringify({ ok: true }));
      },
    });

    await client.updateGraph({
      graph: "urn:test:graph",
      delete: [],
      insert: [{ "@id": "urn:test:inserted" }],
    });

    expect(JSON.parse(bodies[0] ?? "")).toEqual({
      graph: "urn:test:graph",
      insert: [{ "@id": "urn:test:inserted" }],
    });
    await expect(
      client.updateGraph({
        graph: "urn:test:graph",
        delete: [],
        insert: [],
      })
    ).rejects.toThrow(/non-empty delete or insert clause/u);
    expect(bodies).toHaveLength(1);
  });

  test("preserves tracked response metadata", async () => {
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async () =>
        new Response(JSON.stringify({ result: [["value"]] }), {
          headers: {
            "x-fdb-reasoning": JSON.stringify({ capped: false }),
            "x-fluree-commit": "fluree:commit:sha256:abc",
            "x-fluree-t": "7",
          },
        }),
    });

    expect(await client.sparql("SELECT * WHERE {}", true)).toEqual({
      result: [["value"]],
      reasoning: { capped: false },
      commit: "fluree:commit:sha256:abc",
      t: 7,
    });
  });

  test("carries native read-after-write time across later queries", async () => {
    const requests: { headers: Headers; url: string }[] = [];
    const responseTimes = [7, undefined, 5, undefined, 9, undefined] as const;
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async (input, init) => {
        requests.push({ headers: new Headers(init?.headers), url: String(input) });
        const t = responseTimes[requests.length - 1];
        return new Response(JSON.stringify({ result: [] }), {
          headers: t === undefined ? {} : { "x-fluree-t": String(t) },
        });
      },
    });

    await client.upsertTrig("<urn:test:s> <urn:test:p> <urn:test:o> .", true);
    await client.query({ from: client.ledger, select: ["?value"], where: [] });
    await client.upsertTurtle("<urn:test:s> <urn:test:p> <urn:test:o> .", true);
    await client.sparql(`SELECT ?value FROM <${client.ledger}> WHERE {}`, false);
    await client.sparql(`SELECT ?value FROM <${client.ledger}> WHERE {}`, true);
    await client.query({ from: client.ledger, select: ["?value"], where: [] });

    expect(requests.map(({ headers }) => headers.get("Fluree-Min-T"))).toEqual([
      null,
      "7",
      null,
      "7",
      "7",
      "9",
    ]);
  });

  test("attests the server's resolved background-indexing mode", async () => {
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async () =>
        new Response(JSON.stringify({ indexing_enabled: false, version: "4.1.4" })),
    });

    await expect(client.assertBackgroundIndexing(false)).resolves.toBeUndefined();
    await expect(client.assertBackgroundIndexing(true)).rejects.toThrow(
      /background indexing must be true/u
    );
  });

  test("waits for the indexed ledger position captured after a write", async () => {
    const requests: string[] = [];
    let infoCalls = 0;
    const client = new FlureeClient({
      ledger: "example/history:main",
      fetch: async (input) => {
        requests.push(String(input));
        infoCalls += 1;
        return new Response(
          JSON.stringify({
            ledger_id: "example/history:main",
            t: infoCalls > 1 ? 7 : 6,
            ledger: {
              alias: "example/history:main",
              t: infoCalls > 1 ? 8 : 7,
              "commit-t": 0,
              "index-t": infoCalls > 1 ? 7 : 6,
            },
            commitId: "fluree:commit:sha256:head",
            indexId: "fluree:index:sha256:index",
            index: {
              t: infoCalls > 1 ? 7 : 6,
              id: "fluree:index:sha256:index",
            },
          })
        );
      },
    });

    await expect(client.waitForIndex(1_000)).resolves.toEqual({
      ledger: "example/history:main",
      commitT: 8,
      indexT: 7,
      commitId: "fluree:commit:sha256:head",
      indexId: "fluree:index:sha256:index",
    });
    expect(requests).toEqual([
      "http://127.0.0.1:8091/v1/fluree/info/example/history:main",
      "http://127.0.0.1:8091/v1/fluree/info/example/history:main",
    ]);
  });

  test("accepts indexed tracked writes when cached nameservice commit metadata is stale", async () => {
    let infoCalls = 0;
    const client = new FlureeClient({
      ledger: "example/history:main",
      fetch: async (input) => {
        if (String(input).includes("/update?")) {
          return new Response(JSON.stringify({ result: { updated: true } }), {
            headers: { "x-fluree-t": "1" },
          });
        }
        infoCalls += 1;
        return new Response(
          JSON.stringify({
            ledger_id: "example/history:main",
            t: 1,
            ledger: {
              alias: "example/history:main",
              t: 1,
              "commit-t": 0,
              "index-t": 1,
            },
            commitId: "fluree:commit:sha256:one",
            indexId: "fluree:index:sha256:one",
            index: { t: 1, id: "fluree:index:sha256:one" },
          })
        );
      },
    });

    await client.updateGraph({
      graph: "urn:test:semantic",
      insert: [{ "@id": "urn:test:fact", "urn:test:value": true }],
      tracked: true,
    });

    await expect(client.waitForIndex(1_000)).resolves.toEqual({
      ledger: "example/history:main",
      commitT: 1,
      indexT: 1,
      commitId: "fluree:commit:sha256:one",
      indexId: "fluree:index:sha256:one",
    });
    expect(infoCalls).toBe(1);
  });

  test("refuses malformed ledger positions and invalid wait bounds", async () => {
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async () =>
        new Response(
          JSON.stringify({
            ledger_id: "example:main",
            commit_t: 1,
            index_t: "not-a-number",
          })
        ),
    });

    await expect(client.info()).rejects.toThrow(/invalid index_t/u);
    await expect(client.waitForIndex(0)).rejects.toThrow(/positive safe integer/u);
  });

  test("creates the ledger family independently of the configured branch", async () => {
    let body: string | undefined;
    const client = new FlureeClient({
      ledger: "example/history:review/one",
      fetch: async (_input, init) => {
        body = typeof init?.body === "string" ? init.body : undefined;
        return new Response("{}", { status: 200 });
      },
    });

    await client.createLedger();

    expect(client.ledger).toBe("example/history:review/one");
    expect(JSON.parse(body ?? "")).toEqual({ ledger: "example/history" });
  });

  test("throws an HTTP error with the server diagnostic", async () => {
    const client = new FlureeClient({
      ledger: "example:main",
      fetch: async () =>
        new Response(JSON.stringify({ error: "invalid query" }), {
          status: 400,
          statusText: "Bad Request",
        }),
    });

    await expect(client.query({})).rejects.toBeInstanceOf(FlureeHttpError);
    await expect(client.query({})).rejects.toThrow(/invalid query/u);
  });
});
