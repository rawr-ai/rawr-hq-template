import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

describe("api plugin example surface", () => {
  it("serves support-triage procedures for first-party /rpc callers", async () => {
    const app = createApp();

    const requestResponse = await app.handle(
      new Request("http://localhost/rpc/supportTriage/requestTriageJob", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({
          json: {
            queueId: "queue.rpc",
            requestedBy: "user.first-party",
            source: "manual",
          },
        }),
      }),
    );

    expect(requestResponse.status).toBe(200);
    const requestPayload = (await requestResponse.json()) as {
      json?: {
        job?: {
          jobId?: string;
          status?: string;
        };
      };
    };
    expect(typeof requestPayload.json?.job?.jobId).toBe("string");
    expect(requestPayload.json?.job?.status).toBe("queued");

    const listResponse = await app.handle(
      new Request("http://localhost/rpc/supportTriage/listTriageJobs", {
        method: "POST",
        headers: FIRST_PARTY_RPC_HEADERS,
        body: JSON.stringify({ json: {} }),
      }),
    );

    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      json?: {
        jobs?: unknown[];
      };
    };
    expect(Array.isArray(listPayload.json?.jobs)).toBe(true);
    expect(listPayload.json?.jobs?.length).toBeGreaterThan(0);
  });

  it("serves support-triage routes for external /api/orpc/* callers", async () => {
    const app = createApp();

    const createResponse = await app.handle(
      new Request("http://localhost/api/orpc/support-triage/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rawr-caller-surface": "external",
        },
        body: JSON.stringify({
          queueId: "queue.external",
          requestedBy: "user.external",
          source: "workflow",
        }),
      }),
    );

    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      job?: {
        jobId?: string;
      };
    };
    expect(typeof created.job?.jobId).toBe("string");

    const jobId = created.job?.jobId ?? "";
    const getResponse = await app.handle(
      new Request(`http://localhost/api/orpc/support-triage/jobs/${jobId}`, {
        headers: {
          "x-rawr-caller-surface": "external",
        },
      }),
    );

    expect(getResponse.status).toBe(200);
    const getPayload = (await getResponse.json()) as {
      job?: {
        jobId?: string;
        queueId?: string;
      };
    };
    expect(getPayload.job?.jobId).toBe(jobId);
    expect(getPayload.job?.queueId).toBe("queue.external");
  });

  it("rejects caller paths on /api/inngest", async () => {
    const app = createApp();

    const firstPartyIngressResponse = await app.handle(
      new Request("http://localhost/api/inngest", {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "first-party",
          "x-rawr-session-auth": "verified",
        },
      }),
    );
    expect(firstPartyIngressResponse.status).toBe(403);

    const externalIngressResponse = await app.handle(
      new Request("http://localhost/api/inngest", {
        method: "GET",
        headers: {
          "x-rawr-caller-surface": "external",
        },
      }),
    );
    expect(externalIngressResponse.status).toBe(403);
  });
});
