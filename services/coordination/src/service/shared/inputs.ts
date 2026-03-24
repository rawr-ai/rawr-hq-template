import { normalizeCoordinationId } from "../../ids";

export function parseCoordinationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return normalizeCoordinationId(value);
}
