import { describe, expect, it } from "vitest";
import { createRouterClient, implement } from "@orpc/server";
import { Type } from "typebox";

import { createContractBuilder } from "../src/orpc/factory/contract";
import {
  defineService,
  schema,
  type BaseMetadata,
  type FeedbackClient,
} from "../src/orpc-sdk";
import { feedbackProvider } from "../src/orpc/middleware/feedback-provider";

describe("provider middleware", () => {
  it("adds feedback execution context only when attached", async () => {
    const calls: Array<{ path: string; traceId?: string }> = [];

    const feedbackClient: FeedbackClient = {
      async createSession(input) {
        calls.push(input);
        return { sessionId: "session-123" };
      },
    };

    const ocBase = createContractBuilder<BaseMetadata>({
      baseMetadata: { idempotent: true },
    });

    const feedbackContract = {
      ping: ocBase
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          sessionId: Type.String(),
        }, { additionalProperties: false }))),
    };

    const os = implement(feedbackContract)
      .$context<{
        deps: { feedback: FeedbackClient };
        scope: {};
        config: {};
        invocation: { traceId: string };
      }>()
      .use(feedbackProvider);

    const ping = os.ping.handler(async ({ context }) => {
      return { sessionId: context.provided.feedbackSession.sessionId };
    });

    const router = os.router({ ping });

    const client = createRouterClient(router, {
      context: (clientContext: { invocation: { traceId: string } }) => ({
        deps: { feedback: feedbackClient },
        scope: {},
        config: {},
        invocation: clientContext.invocation,
      }),
    });

    await expect(client.ping({}, {
      context: {
        invocation: {
          traceId: "trace-42",
        },
      },
    })).resolves.toEqual({ sessionId: "session-123" });
    expect(calls).toEqual([{ path: "ping", traceId: "trace-42" }]);
  });

  it("defineService binds metadata into contract and middleware authoring", async () => {
    type TestService = {
      initialContext: {
        deps: {
          logger: {
            info(message: string, meta?: Record<string, unknown>): void;
            error(message: string, meta?: Record<string, unknown>): void;
          };
          analytics: {
            track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
          };
        };
        scope: {};
        config: {
          readOnly: boolean;
        };
      };
      invocationContext: {
        traceId: string;
      };
      metadata: {
        audit?: "basic" | "full";
      };
    };

    const service = defineService<TestService>({
      metadataDefaults: {
        idempotent: true,
        audit: "basic",
      },
      baseline: {
        policy: { events: {} },
      },
    });

    const contract = {
      ping: service.oc
        .meta({ idempotent: true })
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          ok: Type.Boolean(),
        }, { additionalProperties: false }))),
    };

    const metadataAwareMiddleware = service.createMiddleware().middleware(async ({ procedure, next }) => {
      expect(procedure["~orpc"].meta.audit).toBe("basic");
      return next();
    });

    const os = implement(contract)
      .$context<{
        deps: {};
        scope: {};
        config: {
          readOnly: boolean;
        };
        invocation: {
          traceId: string;
        };
      }>()
      .use(metadataAwareMiddleware);

    const ping = os.ping.handler(async () => ({ ok: true }));
    const router = os.router({ ping });
    const client = createRouterClient(router, {
      context: {
        deps: {},
        scope: {},
        config: {
          readOnly: false,
        },
        invocation: {
          traceId: "trace-metadata",
        },
      },
    });

    await expect(client.ping({})).resolves.toEqual({ ok: true });
  });

  it("defineService binds service context into implementer creation", async () => {
    type TestService = {
      initialContext: {
        deps: {
          logger: {
            info(message: string, meta?: Record<string, unknown>): void;
            error(message: string, meta?: Record<string, unknown>): void;
          };
          analytics: {
            track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
          };
        };
        scope: {};
        config: {
          readOnly: boolean;
        };
      };
      invocationContext: {
        traceId: string;
      };
      metadata: {};
    };

    const service = defineService<TestService>({
      metadataDefaults: {
        idempotent: true,
      },
      baseline: {
        policy: { events: {} },
      },
    });

    const contract = {
      ping: service.oc
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          readOnly: Type.Boolean(),
        }, { additionalProperties: false }))),
    };

    const requiredTelemetry = {
      observability: service.createRequiredObservabilityMiddleware({}),
      analytics: service.createRequiredAnalyticsMiddleware({}),
    };
    const os = service.createImplementer(contract, requiredTelemetry);

    const ping = os.ping.handler(async ({ context }) => {
      return { readOnly: context.config.readOnly };
    });

    const router = os.router({ ping });
    const client = createRouterClient(router, {
      context: {
        deps: {
          logger: {
            info() {},
            error() {},
          },
          analytics: {
            track() {},
          },
        },
        scope: {},
        config: {
          readOnly: true,
        },
        invocation: {
          traceId: "trace-read-only",
        },
        provided: {},
      },
    });

    await expect(client.ping({})).resolves.toEqual({ readOnly: true });
  });

  it("defineService exposes a provider builder for service-local context", async () => {
    type TestService = {
      initialContext: {
        deps: {
          logger: {
            info(message: string, meta?: Record<string, unknown>): void;
            error(message: string, meta?: Record<string, unknown>): void;
          };
          analytics: {
            track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
          };
        };
        scope: {};
        config: {
          readOnly: boolean;
        };
      };
      invocationContext: {
        traceId: string;
      };
      metadata: {};
    };

    const service = defineService<TestService>({
      metadataDefaults: {
        idempotent: true,
      },
      baseline: {
        policy: { events: {} },
      },
    });

    const contract = {
      ping: service.oc
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          repoId: Type.String(),
        }, { additionalProperties: false }))),
    };

    const repoProvider = service.createProvider().middleware<{
      repo: {
        id: string;
      };
    }>(async ({ next }) => {
      return next({
        repo: {
          id: "repo-123",
        },
      });
    });

    const requiredTelemetry = {
      observability: service.createRequiredObservabilityMiddleware({}),
      analytics: service.createRequiredAnalyticsMiddleware({}),
    };
    const os = service.createImplementer(contract, requiredTelemetry).use(repoProvider);

    const ping = os.ping.handler(async ({ context }) => {
      return { repoId: context.provided.repo.id };
    });

    const router = os.router({ ping });
    const client = createRouterClient(router, {
      context: {
        deps: {
          logger: {
            info() {},
            error() {},
          },
          analytics: {
            track() {},
          },
        },
        scope: {},
        config: {
          readOnly: false,
        },
        invocation: {
          traceId: "trace-repo",
        },
        provided: {},
      },
    });

    await expect(client.ping({})).resolves.toEqual({ repoId: "repo-123" });
  });

  it("throws when providers try to overwrite an existing provided key", async () => {
    type TestService = {
      initialContext: {
        deps: {
          logger: {
            info(message: string, meta?: Record<string, unknown>): void;
            error(message: string, meta?: Record<string, unknown>): void;
          };
          analytics: {
            track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
          };
        };
        scope: {};
        config: {
          readOnly: boolean;
        };
      };
      invocationContext: {
        traceId: string;
      };
      metadata: {};
    };

    const service = defineService<TestService>({
      metadataDefaults: {
        idempotent: true,
      },
      baseline: {
        policy: { events: {} },
      },
    });

    const contract = {
      ping: service.oc
        .input(schema(Type.Object({}, { additionalProperties: false })))
        .output(schema(Type.Object({
          repoId: Type.String(),
        }, { additionalProperties: false }))),
    };

    const firstProvider = service.createProvider().middleware<{
      repo: {
        id: string;
      };
    }>(async ({ next }) => {
      return next({
        repo: {
          id: "repo-1",
        },
      });
    });

    const collidingProvider = (service.createProvider as () => {
      middleware<TAdded extends object>(
        callback: (options: {
          next(provided: TAdded): unknown;
        }) => unknown,
      ): unknown;
    })().middleware<{ repo: { id: string } }>(({ next }) => {
      return next({
        repo: {
          id: "repo-overwrite",
        },
      });
    });

    const requiredTelemetry = {
      observability: service.createRequiredObservabilityMiddleware({}),
      analytics: service.createRequiredAnalyticsMiddleware({}),
    };
    const os = service.createImplementer(contract, requiredTelemetry)
      .use(firstProvider)
      .use(collidingProvider as never);

    const ping = os.ping.handler(async ({ context }) => {
      return { repoId: context.provided.repo.id };
    });

    const router = os.router({ ping });
    const client = createRouterClient(router, {
      context: {
        deps: {
          logger: {
            info() {},
            error() {},
          },
          analytics: {
            track() {},
          },
        },
        scope: {},
        config: {
          readOnly: false,
        },
        invocation: {
          traceId: "trace-overwrite",
        },
        provided: {},
      },
    });

    await expect(client.ping({})).rejects.toThrow(/overwrite existing provided keys: repo/);
  });
});
