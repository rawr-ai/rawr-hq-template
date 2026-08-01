import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { ConfigLayeredResultSchema, EmptyConfigInputSchema } from "../model/dto/config.dto";

/** Declares the read-only layered HQ configuration operation. */
export const getLayeredConfig = oc
  .meta(procedureMetadata({ idempotent: true, entity: "config" }))
  .input(standard(EmptyConfigInputSchema))
  .output(standard(ConfigLayeredResultSchema));
