// TODO/P2: prove runtime profile config and redaction handoff.
//
// The lab should eventually prove typed config binding and diagnostic-safe
// redaction without making deployment own runtime provider selection or
// provider acquisition.

export interface ExpectedRuntimeProfileConfigRedaction {
  readonly configSource: "profile-selected";
  readonly decodedConfig: "runtime-schema-inferred";
  readonly secretEmission: "redacted";
  readonly deploymentRole: "handoff-and-placement-only";
  readonly providerAcquisitionInDeployment: "forbidden";
}
