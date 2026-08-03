import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { SecurityReportSchema } from "../model/dto/security.dto";

const EmptyInputSchema = standard(Type.Object({}, { additionalProperties: false }));

/** Reads the latest persisted security report when one exists. */
export const getSecurityReport = oc
  .meta(procedureMetadata({ idempotent: true, entity: "security" }))
  .input(EmptyInputSchema)
  .output(standard(Type.Union([SecurityReportSchema, Type.Null()])));
