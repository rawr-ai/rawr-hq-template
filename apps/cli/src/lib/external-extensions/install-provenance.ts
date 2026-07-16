import path from "node:path";

const DIGEST = "[a-f0-9]{64}";
const ARTIFACT_NAME = new RegExp(`^rawr-(${DIGEST})-(${DIGEST})\\.tgz$`, "u");

export type NativeInstallProvenance = Readonly<{
  artifactSha256: string;
  staticFingerprint: string;
}>;

export function nativeInstallArtifactName(provenance: NativeInstallProvenance): string {
  requireDigest(provenance.artifactSha256);
  requireDigest(provenance.staticFingerprint);
  return `rawr-${provenance.artifactSha256}-${provenance.staticFingerprint}.tgz`;
}

export function parseNativeInstallProvenance(
  url: string | undefined,
): NativeInstallProvenance | null {
  if (url === undefined) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "file:") return null;
  const match = ARTIFACT_NAME.exec(path.posix.basename(parsed.pathname));
  return match
    ? Object.freeze({ artifactSha256: match[1]!, staticFingerprint: match[2]! })
    : null;
}

function requireDigest(value: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error("EXTERNAL_EXTENSION_PROVENANCE_DIGEST_INVALID");
}
