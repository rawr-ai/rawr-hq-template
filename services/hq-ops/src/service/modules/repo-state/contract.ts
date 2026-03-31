import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { RepoStateSchema, type RepoState } from "../../../repo-state/model";
import { ocBase } from "../../base";

export const GetStateInputSchema = Type.Object({}, { additionalProperties: false });

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
};

export type RepoStateModuleContract = typeof contract;
