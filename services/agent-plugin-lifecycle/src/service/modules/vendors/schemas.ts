import { Type } from "typebox";

import { PluginIdSchema, VendorRecordBindingSchema } from "./model/dto/vendor-records";

export {
  CANONICAL_ABSOLUTE_PATH_PATTERN,
  CONTENT_AUTHORITY_PATTERN,
  GIT_OBJECT_ID_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  NormalizedRelativePathSchema,
  PLUGIN_ID_PATTERN,
  QUALIFIED_HEAD_REF_PATTERN,
  REPOSITORY_IDENTITY_PATTERN,
  SHA256_DIGEST_PATTERN,
  SOURCE_ID_PATTERN,
  SUPPORTED_BASELINE_PATTERN,
  STRICT_UTC_RFC3339_PATTERN,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorSourceDeclarationSchema,
  VendorSourceIdentitySchema,
} from "./model/dto/vendor-records";
export {
  VendorContentWorkspaceRefSchema,
  VendorSourceStatusSchema,
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateIssueSchema,
  VendorUpdateResultSchema,
} from "./model/dto/vendor-operations";

export const VendorMemberBindingContextSchema = Type.Object(
  {
    memberPluginId: PluginIdSchema,
    declaration: VendorRecordBindingSchema,
    provenance: VendorRecordBindingSchema,
  },
  { additionalProperties: false }
);
