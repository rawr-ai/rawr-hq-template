import { describe, expect, expectTypeOf, it } from "vitest";

import { createApiCorrelationForwardingOptions } from "../../src/apis";

describe("API correlation forwarding", () => {
  it("forwards caller correlation without manufacturing trace identity", () => {
    const options = createApiCorrelationForwardingOptions({
      correlationId: "correlation-api-1",
    });

    expect(options).toEqual({
      context: {
        invocation: {
          correlationId: "correlation-api-1",
        },
      },
    });
    expectTypeOf(options.context.invocation).toEqualTypeOf<Readonly<{ correlationId: string }>>();

    if (false) {
      // @ts-expect-error Caller-authored trace identity is not API correlation context.
      createApiCorrelationForwardingOptions({ traceId: "trace-api-1" });
    }
  });
});
