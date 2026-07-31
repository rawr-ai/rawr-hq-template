import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { ConfigLoadResultSchema, EmptyConfigInputSchema } from "../model/dto/config.dto";

/** Declares the read-only global HQ configuration operation. */
export const getGlobalConfig = oc
  .meta(procedureMetadata({ idempotent: true, entity: "config" }))
  .input(standard(EmptyConfigInputSchema))
  .output(standard(ConfigLoadResultSchema));
