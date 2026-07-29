import { status } from "./status";
import { update } from "./update";

/** Vendors contract composed from its read-only status and explicit update leaves. */
export const contract = {
  status,
  update,
};
