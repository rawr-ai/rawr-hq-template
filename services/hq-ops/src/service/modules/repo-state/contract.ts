import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { RepoStateSchema, type RepoState } from "./entities";
import { ocBase } from "../../base";

const GetStateInputSchema = Type.Object({}, { additionalProperties: false });
const UpdatePluginInputSchema = Type.Object(
  {
    pluginId: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const GetStateOutputSchema = Type.Object(
  {
    state: RepoStateSchema,
    authorityRepoRoot: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const RepoStateLockTimeoutDataSchema = schema(
  Type.Object(
    {
      lockPath: Type.String({ minLength: 1 }),
    },
    {
      additionalProperties: false,
      description: "Repo state lock path that could not be acquired.",
    },
  ),
);

const REPO_STATE_LOCK_TIMEOUT = {
  status: 409,
  message: "Timed out waiting for repo state lock",
  data: RepoStateLockTimeoutDataSchema,
} as const;

export const contract = {
  getState: ocBase
    .meta({ idempotent: true, entity: "repoState" })
    .input(schema(GetStateInputSchema))
    .output(schema(GetStateOutputSchema)),
  enablePlugin: ocBase
    .meta({ idempotent: false, entity: "repoState" })
    .input(schema(UpdatePluginInputSchema))
    .output(schema(RepoStateSchema))
    .errors({ REPO_STATE_LOCK_TIMEOUT }),
  disablePlugin: ocBase
    .meta({ idempotent: false, entity: "repoState" })
    .input(schema(UpdatePluginInputSchema))
    .output(schema(RepoStateSchema))
    .errors({ REPO_STATE_LOCK_TIMEOUT }),
};
