const PACKAGE_ID_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;

export function isCanonicalPackageId(value: string): boolean {
  return PACKAGE_ID_PATTERN.test(value);
}
