import { ORPCError } from "@orpc/server";

export type SupportTriageBoundaryTransportCode = "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR";

export type SupportTriageBoundaryErrorOptions = {
  transportCode: SupportTriageBoundaryTransportCode;
  status: number;
  domainCode: string;
  message: string;
  data?: Record<string, unknown>;
};

export function throwSupportTriageBoundaryError(input: SupportTriageBoundaryErrorOptions): never {
  throw new ORPCError(input.transportCode, {
    status: input.status,
    message: input.message,
    data: {
      code: input.domainCode,
      ...(input.data ?? {}),
    },
  });
}

