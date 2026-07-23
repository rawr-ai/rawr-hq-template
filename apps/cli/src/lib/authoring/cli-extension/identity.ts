declare const externalExtensionIdentityBrand: unique symbol;

export type ExternalExtensionIdentity = string & {
  readonly [externalExtensionIdentityBrand]: true;
};
export type ExternalExtensionIdentityIssue = Readonly<{
  path: "destination" | "id";
  message: string;
}>;

const EXTENSION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function parseExternalExtensionIdentity(
  input: unknown
): ExternalExtensionIdentity | ExternalExtensionIdentityIssue {
  return typeof input === "string" && input.length <= 64 && EXTENSION_ID_PATTERN.test(input)
    ? (input as ExternalExtensionIdentity)
    : Object.freeze({
        path: "id",
        message: "Extension identity must be bounded lowercase kebab-case",
      });
}

export function isExternalExtensionIdentityIssue(
  value: ExternalExtensionIdentity | ExternalExtensionIdentityIssue
): value is ExternalExtensionIdentityIssue {
  return typeof value === "object";
}
