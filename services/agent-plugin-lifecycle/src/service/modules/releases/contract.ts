import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import {
  CheckInputSchema,
  CheckResultSchema,
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
} from "./schemas";

export const contract = {
  check: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "releases" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "releases",
    })
    .input(schema(CheckInputSchema))
    .output(schema(CheckResultSchema)),
  releaseInputRecord: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "releases" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "releases",
    })
    .input(schema(ReleaseInputRecordInputSchema))
    .output(schema(ReleaseInputRecordResultSchema)),
  refreshReleaseInput: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "releases" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "releases",
    })
    .input(schema(ReleaseInputRefreshInputSchema))
    .output(schema(ReleaseInputRefreshResultSchema)),
  checkRepository: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "releases" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "releases",
    })
    .input(schema(RepositoryCheckInputSchema))
    .output(schema(RepositoryCheckResultSchema)),
};
