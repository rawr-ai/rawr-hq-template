import { type AnyElysia, Elysia } from "elysia";

export type RawrServerApp = AnyElysia;

export function createServerApp() {
  return new Elysia().get("/health", () => ({ ok: true }));
}
