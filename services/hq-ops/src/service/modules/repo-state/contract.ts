import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { RepoStateSchema, type RepoState } from "./model";
import { ocBase } from "../../base";

export const GetStateInputSchema = Type.Object({}, { additionalProperties: false });
export const UpdatePluginInputSchema = Type.Object(
  {
    pluginId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const GetStateOutputSchema = Type.Object(
  {
    state: RepoStateSchema,
    authorityRepoRoot: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const contract = {
  getState: ocBase
    .meta({ idempotent: true, entity: "repoState" })
    .input(schema(GetStateInputSchema))
    .output(schema(GetStateOutputSchema)),
  enablePlugin: ocBase
    .meta({ idempotent: false, entity: "repoState" })
    .input(schema(UpdatePluginInputSchema))
    .output(schema(RepoStateSchema)),
  disablePlugin: ocBase
    .meta({ idempotent: false, entity: "repoState" })
    .input(schema(UpdatePluginInputSchema))
    .output(schema(RepoStateSchema)),
};

export type RepoStateModuleContract = typeof contract;
