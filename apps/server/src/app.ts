import { Elysia } from "elysia";

export function createServerApp() {
  return new Elysia().get("/health", () => ({ ok: true }));
}

