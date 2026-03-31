import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createServerApp } from "../src/app";
import { registerRawrRoutes } from "../src/rawr";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const REQUIRED_SUITE_IDS = [
  "suite:web:first-party-rpc",
  "suite:web:published-openapi",
  "suite:cli:in-process",
  "suite:api:boundary",
  "suite:workflow:trigger-status",
  "suite:runtime:ingress",
  "suite:cross-surface:metadata-import-boundary",
] as const;

const REQUIRED_NEGATIVE_ASSERTION_KEYS = [
  "assertion:reject-api-inngest-from-caller-paths",
  "assertion:reject-ingress-spoofed-caller-headers",
  "assertion:reject-rpc-from-external-callers",
  "assertion:reject-rpc-from-runtime-ingress",
  "assertion:reject-rpc-workflows-route-family",
  "assertion:runtime-ingress-no-caller-boundary-semantics",
  "assertion:in-process-no-local-http-self-call",
] as const;

const FIRST_PARTY_RPC_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "first-party",
  "x-rawr-session-auth": "verified",
} as const;

const EXTERNAL_API_HEADERS = {
  "content-type": "application/json",
  "x-rawr-caller-surface": "external",
} as const;

type MatrixCase = {
  suiteId: (typeof REQUIRED_SUITE_IDS)[number];
  assertionKey: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
  expectedStatus: number;
};

const MATRIX_CASES: MatrixCase[] = [
  {
    suiteId: "suite:web:first-party-rpc",
    assertionKey: "assertion:keep-first-party-rpc-on-rpc",
    method: "POST",
    path: "/rpc/state/getRuntimeState",
    headers: FIRST_PARTY_RPC_HEADERS,
    body: JSON.stringify({ json: {} }),
    expectedStatus: 200,
  },
  {
    suiteId: "suite:web:published-openapi",
    assertionKey: "assertion:keep-published-openapi-on-api-orpc",
    method: "POST",
    path: "/api/orpc/exampleTodo/tasks/create",
    headers: EXTERNAL_API_HEADERS,
    body: JSON.stringify({ title: "Boundary proof task" }),
    expectedStatus: 200,
  },
  {
    suiteId: "suite:api:boundary",
    assertionKey: "assertion:reject-rpc-from-external-callers",
    method: "POST",
    path: "/rpc/state/getRuntimeState",
    headers: EXTERNAL_API_HEADERS,
    body: JSON.stringify({ json: {} }),
    expectedStatus: 403,
  },
  {
    suiteId: "suite:runtime:ingress",
    assertionKey: "assertion:reject-api-inngest-from-caller-paths",
    method: "GET",
    path: "/api/inngest",
    expectedStatus: 403,
  },
  {
    suiteId: "suite:runtime:ingress",
    assertionKey: "assertion:reject-ingress-spoofed-caller-headers",
    method: "POST",
    path: "/api/inngest",
    headers: {
      "content-type": "application/json",
      "x-rawr-caller-surface": "first-party",
      "x-rawr-session-auth": "verified",
      "x-inngest-signature": `t=${Math.floor(Date.now() / 1000)}&s=deadbeef`,
    },
    body: JSON.stringify({ ping: true }),
    expectedStatus: 403,
  },
  {
    suiteId: "suite:cli:in-process",
    assertionKey: "assertion:in-process-no-local-http-self-call",
    method: "POST",
    path: "/rpc/state/getRuntimeState",
    headers: {
      "content-type": "application/json",
      "x-rawr-caller-surface": "runtime-ingress",
      "x-rawr-service-auth": "verified",
    },
    body: JSON.stringify({ json: {} }),
    expectedStatus: 403,
  },
  {
    suiteId: "suite:workflow:trigger-status",
    assertionKey: "assertion:reject-rpc-workflows-route-family",
    method: "POST",
    path: "/rpc/workflows/state/getRuntimeState",
    headers: FIRST_PARTY_RPC_HEADERS,
    body: JSON.stringify({ json: {} }),
    expectedStatus: 404,
  },
  {
    suiteId: "suite:cross-surface:metadata-import-boundary",
    assertionKey: "assertion:runtime-ingress-no-caller-boundary-semantics",
    method: "GET",
    path: "/api/workflows/state/runtime",
    expectedStatus: 404,
  },
];

function createApp() {
  return registerRawrRoutes(createServerApp(), {
    repoRoot,
    enabledPluginIds: new Set(),
    baseUrl: "http://localhost:3000",
  });
}

describe("route boundary matrix", () => {
  it("declares the required suite IDs and negative assertion keys", () => {
    expect(REQUIRED_SUITE_IDS).toEqual([
      "suite:web:first-party-rpc",
      "suite:web:published-openapi",
      "suite:cli:in-process",
      "suite:api:boundary",
      "suite:workflow:trigger-status",
      "suite:runtime:ingress",
      "suite:cross-surface:metadata-import-boundary",
    ]);
    expect(REQUIRED_NEGATIVE_ASSERTION_KEYS).toEqual(expect.arrayContaining([
      "assertion:reject-api-inngest-from-caller-paths",
      "assertion:reject-rpc-from-external-callers",
      "assertion:reject-rpc-workflows-route-family",
      "assertion:runtime-ingress-no-caller-boundary-semantics",
      "assertion:in-process-no-local-http-self-call",
    ]));
  });

  it("keeps the positive route families on their canonical surfaces", async () => {
    const app = createApp();
    const positiveCases = MATRIX_CASES.filter((testCase) => testCase.expectedStatus === 200);

    for (const testCase of positiveCases) {
      const response = await app.handle(
        new Request(`http://localhost${testCase.path}`, {
          method: testCase.method,
          headers: testCase.headers,
          body: testCase.body,
        }),
      );

      expect(response.status, testCase.assertionKey).toBe(200);
    }
  });

  it("route negative assertions keep D-015 style negatives explicit", async () => {
    const app = createApp();
    const negativeCases = MATRIX_CASES.filter((testCase) => testCase.expectedStatus >= 400);

    for (const testCase of negativeCases) {
      const response = await app.handle(
        new Request(`http://localhost${testCase.path}`, {
          method: testCase.method,
          headers: testCase.headers,
          body: testCase.body,
        }),
      );

      expect(response.status, testCase.assertionKey).toBe(testCase.expectedStatus);
    }
  });
});
