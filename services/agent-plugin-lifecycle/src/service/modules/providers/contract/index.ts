import { status } from "./status";
import { sync } from "./sync";
import { test } from "./test";

/** Providers contract composed from its test, status, and sync operation leaves. */
export const contract = {
  test,
  status,
  sync,
};
