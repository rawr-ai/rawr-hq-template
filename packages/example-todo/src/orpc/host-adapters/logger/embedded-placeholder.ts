import type { Logger } from "../../ports/logger";

/**
 * @fileoverview Embedded placeholder logger adapter.
 *
 * @remarks
 * This is a temporary embedded adapter used to make the host-adapter shape
 * explicit in tests and in-process composition. It is not the final logging
 * integration for the package.
 */

export type EmbeddedPlaceholderLogEntry = {
  level: "info" | "error";
  event: string;
  payload: Record<string, unknown>;
};

type EmbeddedPlaceholderLoggerOptions = {
  sink?: EmbeddedPlaceholderLogEntry[];
};

export function createEmbeddedPlaceholderLoggerAdapter(
  options: EmbeddedPlaceholderLoggerOptions = {},
): Logger {
  return {
    info(event, payload) {
      options.sink?.push({
        level: "info",
        event,
        payload: (payload as Record<string, unknown> | undefined) ?? {},
      });
    },
    error(event, payload) {
      options.sink?.push({
        level: "error",
        event,
        payload: (payload as Record<string, unknown> | undefined) ?? {},
      });
    },
  };
}
