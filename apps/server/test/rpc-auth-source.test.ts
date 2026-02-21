import { describe, expect, it } from "vitest";

import {
  classifyRpcRequest,
  createRpcAuthPolicy,
  isRpcRequestAllowed,
  type RpcCallerClass,
} from "../src/auth/rpc-auth";

function createRpcRequest(input: { url?: string; headers?: Record<string, string> }): Request {
  return new Request(input.url ?? "http://localhost/rpc/coordination/listWorkflows", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.headers ?? {}),
    },
    body: JSON.stringify({ json: {} }),
  });
}

function classify(input: { url?: string; headers?: Record<string, string> }): RpcCallerClass {
  const policy = createRpcAuthPolicy({ baseUrl: "http://localhost:3000" });
  return classifyRpcRequest(createRpcRequest(input), policy);
}

describe("rpc auth source classification", () => {
  it("allows first-party caller only with session auth evidence", () => {
    const allowedRequest = createRpcRequest({
      headers: {
        "x-rawr-caller-surface": "first-party",
        "x-rawr-session-auth": "verified",
      },
    });

    const deniedRequest = createRpcRequest({
      headers: {
        "x-rawr-caller-surface": "first-party",
      },
    });

    const policy = createRpcAuthPolicy({ baseUrl: "http://localhost:3000" });

    expect(classifyRpcRequest(allowedRequest, policy)).toBe("first-party");
    expect(isRpcRequestAllowed(allowedRequest, policy)).toBe(true);

    expect(classifyRpcRequest(deniedRequest, policy)).toBe("unlabeled");
    expect(isRpcRequestAllowed(deniedRequest, policy)).toBe(false);
  });

  it("allows internal and trusted-service callers only with service auth evidence", () => {
    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "internal",
          "x-rawr-service-auth": "verified",
        },
      }),
    ).toBe("internal");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "trusted-service",
          "x-rawr-service-auth": "verified",
        },
      }),
    ).toBe("trusted-service");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "internal",
        },
      }),
    ).toBe("unlabeled");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "trusted-service",
        },
      }),
    ).toBe("unlabeled");
  });

  it("allows cli caller only with cli auth evidence", () => {
    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "cli",
          "x-rawr-cli-auth": "verified",
        },
      }),
    ).toBe("cli");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "cli",
        },
      }),
    ).toBe("unlabeled");
  });

  it("does not trust cookie, authorization prefix, or user-agent auth heuristics", () => {
    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "first-party",
          cookie: "rawr-session=spoofed-session",
        },
      }),
    ).toBe("unlabeled");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "internal",
          authorization: "service spoofed-token",
        },
      }),
    ).toBe("unlabeled");

    expect(
      classify({
        headers: {
          "x-rawr-caller-surface": "cli",
          "x-rawr-service-auth": "verified",
          "user-agent": "rawr-cli/9.9.9",
        },
      }),
    ).toBe("unlabeled");
  });

  it("denies runtime-ingress, external, and unlabeled rpc requests", () => {
    expect(classify({ headers: { "x-rawr-caller-surface": "runtime-ingress" } })).toBe("runtime-ingress");
    expect(classify({ headers: { "x-rawr-caller-surface": "external" } })).toBe("external");
    expect(classify({ headers: {} })).toBe("unlabeled");
  });

  it("denies requests from untrusted hosts even when caller auth headers are present", () => {
    expect(
      classify({
        url: "http://untrusted.example/rpc/coordination/listWorkflows",
        headers: {
          "x-rawr-caller-surface": "first-party",
          "x-rawr-session-auth": "verified",
        },
      }),
    ).toBe("external");
  });
});
