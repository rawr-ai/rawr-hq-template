import { describe, expect, it } from "vitest";
import { createClient } from "../src";
import { createClientOptions } from "./helpers";

describe("session-intelligence service shape", () => {
  it("exposes the canonical service modules", () => {
    const client = createClient(createClientOptions());
    expect(client.catalog).toBeDefined();
    expect(client.transcripts).toBeDefined();
    expect(client.search).toBeDefined();
  });

  it("keeps the expected module names ratcheted", () => {
    expect(["catalog", "transcripts", "search"]).toEqual(["catalog", "transcripts", "search"]);
  });
});
