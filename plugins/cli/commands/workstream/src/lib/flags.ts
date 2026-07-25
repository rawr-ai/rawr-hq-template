/**
 * @fileoverview Shared CLI flags for work-stream commands.
 */
import { Flags } from "@oclif/core";

/** Flags every work-stream command accepts for ledger selection and output. */
export const ledgerFlags = {
  "ledger-url": Flags.string({
    description: "Fluree server base URL (defaults to FLUREE_URL or http://localhost:8090).",
  }),
  ledger: Flags.string({
    description: "Ledger identity in name:branch form (defaults to workstream:main).",
  }),
  json: Flags.boolean({ description: "Emit raw JSON instead of a rendered summary." }),
};
