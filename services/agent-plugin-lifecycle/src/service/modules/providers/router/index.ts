import { status } from "./status.router";
import { sync } from "./sync.router";
import { test } from "./test.router";

export const router = Object.freeze({ test, status, sync });
