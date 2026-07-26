import { router as sourceLifecycle } from "./router/source-lifecycle.router";

/** Composes the completed Vendor operation leaves for the service root router. */
export const router = { ...sourceLifecycle } as const;
