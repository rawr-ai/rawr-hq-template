import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  ExportAgentPluginsRequestSchema,
  ExportAgentPluginsResultSchema,
} from "./schemas";

export const contract = {
  apply: ocBase
    .meta({ idempotent: true, entity: "exports" })
    .input(schema(ExportAgentPluginsRequestSchema))
    .output(schema(ExportAgentPluginsResultSchema)),
};
