import { Elysia } from "elysia";

const port = Number(process.env.PORT ?? 3000);

new Elysia()
  .get("/health", () => ({ ok: true }))
  .listen(port);

// eslint-disable-next-line no-console
console.log(`@rawr/server listening on :${port}`);

