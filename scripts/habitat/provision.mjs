import { createHash, randomUUID } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { access, chmod, mkdir, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { ReadonlyObject, Type } from "typebox";
import { Value } from "typebox/value";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST_PATH = fileURLToPath(new URL("./release.json", import.meta.url));

const NonEmptyStringSchema = Type.String({ minLength: 1 });
const HabitatReleaseAssetSchema = ReadonlyObject(
  Type.Object({
    filename: NonEmptyStringSchema,
    bytes: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
    sha256: Type.String({ pattern: "^[a-f0-9]{64}$" }),
  }),
  { additionalProperties: false }
);

export const HabitatReleaseManifestSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(1),
    owner: ReadonlyObject(
      Type.Object({
        repository: NonEmptyStringSchema,
        sourceCommit: NonEmptyStringSchema,
        habitatTree: NonEmptyStringSchema,
      }),
      { additionalProperties: false }
    ),
    build: ReadonlyObject(
      Type.Object({
        bunVersion: NonEmptyStringSchema,
        bunRevision: NonEmptyStringSchema,
      }),
      { additionalProperties: false }
    ),
    release: ReadonlyObject(Type.Object({ tag: NonEmptyStringSchema }), {
      additionalProperties: false,
    }),
    assets: ReadonlyObject(
      Type.Object({
        "darwin-arm64": HabitatReleaseAssetSchema,
        "linux-x64": HabitatReleaseAssetSchema,
      }),
      { additionalProperties: false }
    ),
  }),
  { additionalProperties: false }
);

/** @typedef {import("typebox").Static<typeof HabitatReleaseAssetSchema>} HabitatReleaseAsset */
/** @typedef {import("typebox").Static<typeof HabitatReleaseManifestSchema>} HabitatReleaseManifest */
/**
 * @typedef {{
 *   manifest?: HabitatReleaseManifest,
 *   platform?: NodeJS.Platform,
 *   arch?: string,
 *   explicitBinary?: string,
 * }} ProvisionHabitatBinaryOptions
 */

/** @param {string} filename @param {string} field */
function requireAssetFilename(filename, field) {
  if (
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("\0")
  ) {
    throw new Error(`Habitat release manifest requires a basename ${field}`);
  }
  return filename;
}

/** @param {HabitatReleaseAsset} asset @param {string} field */
function normalizeReleaseAsset(asset, field) {
  return Object.freeze({
    ...asset,
    filename: requireAssetFilename(asset.filename, field),
  });
}

/** @param {unknown} value @returns {HabitatReleaseManifest} */
export function parseReleaseManifest(value) {
  if (!Value.Check(HabitatReleaseManifestSchema, value)) {
    const [issue] = Value.Errors(HabitatReleaseManifestSchema, value);
    const path = issue?.instancePath || "(root)";
    throw new Error(`Habitat release manifest is invalid at ${path}`);
  }
  return Object.freeze({
    ...value,
    owner: Object.freeze({ ...value.owner }),
    build: Object.freeze({ ...value.build }),
    release: Object.freeze({ ...value.release }),
    assets: Object.freeze({
      "darwin-arm64": normalizeReleaseAsset(
        value.assets["darwin-arm64"],
        "assets.darwin-arm64.filename"
      ),
      "linux-x64": normalizeReleaseAsset(value.assets["linux-x64"], "assets.linux-x64.filename"),
    }),
  });
}

/**
 * @param {HabitatReleaseManifest} manifest
 * @param {NodeJS.Platform} [platform]
 * @param {string} [arch]
 * @returns {HabitatReleaseAsset}
 */
export function selectReleaseAsset(manifest, platform = process.platform, arch = process.arch) {
  const key = `${platform}-${arch}`;
  if (key !== "darwin-arm64" && key !== "linux-x64") {
    throw new Error(`Habitat standalone check is unavailable for ${key}`);
  }
  return manifest.assets[key];
}

/** @param {string} filename */
export async function sha256File(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

/** @param {string} filename @param {HabitatReleaseAsset} asset */
export async function verifyReleaseAsset(filename, asset) {
  const observed = await stat(filename);
  if (!observed.isFile() || observed.size !== asset.bytes) {
    throw new Error(`Habitat asset size mismatch for ${filename}`);
  }
  const digest = await sha256File(filename);
  if (digest !== asset.sha256) {
    throw new Error(`Habitat asset digest mismatch for ${filename}`);
  }
  return filename;
}

/** @returns {Promise<HabitatReleaseManifest>} */
async function readManifest() {
  return parseReleaseManifest(await Bun.file(MANIFEST_PATH).json());
}

/** @param {HabitatReleaseManifest} manifest @param {HabitatReleaseAsset} asset */
function releaseAssetUrl(manifest, asset) {
  const repository = encodeURI(manifest.owner.repository);
  const tag = encodeURIComponent(manifest.release.tag);
  const filename = encodeURIComponent(asset.filename);
  return `https://github.com/${repository}/releases/download/${tag}/${filename}`;
}

/** @param {unknown} error */
function isMissingPath(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/** @param {string} filename */
async function removeTemporaryFile(filename) {
  try {
    await unlink(filename);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
  }
}

/** @param {string} url @param {string} destination */
async function downloadAsset(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || response.body === null) {
    throw new Error(`Habitat asset download failed with HTTP ${response.status}`);
  }
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination, { flags: "wx", mode: 0o755 })
  );
}

/** @param {ProvisionHabitatBinaryOptions} [options] */
export async function provisionHabitatBinary(options = {}) {
  const manifest = options.manifest ?? (await readManifest());
  const asset = selectReleaseAsset(
    manifest,
    options.platform ?? process.platform,
    options.arch ?? process.arch
  );
  const explicitBinary = options.explicitBinary ?? process.env.HABITAT_SDK_BINARY;
  if (explicitBinary !== undefined) {
    if (!isAbsolute(explicitBinary)) {
      throw new Error("HABITAT_SDK_BINARY must be an absolute path");
    }
    await verifyReleaseAsset(explicitBinary, asset);
    await access(explicitBinary, constants.X_OK);
    return explicitBinary;
  }

  const cacheRoot = join(REPOSITORY_ROOT, ".habitat", "cache", "bin", asset.sha256);
  const destination = join(cacheRoot, asset.filename);
  try {
    await verifyReleaseAsset(destination, asset);
    await chmod(destination, 0o755);
    return destination;
  } catch (error) {
    if (!isMissingPath(error)) {
      await removeTemporaryFile(destination);
    }
  }

  await mkdir(cacheRoot, { recursive: true });
  const temporary = join(cacheRoot, `.${asset.filename}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await downloadAsset(releaseAssetUrl(manifest, asset), temporary);
    await verifyReleaseAsset(temporary, asset);
    await chmod(temporary, 0o755);
    try {
      await verifyReleaseAsset(destination, asset);
      await removeTemporaryFile(temporary);
    } catch (error) {
      if (!isMissingPath(error)) {
        await removeTemporaryFile(destination);
      }
      await rename(temporary, destination);
    }
    return await verifyReleaseAsset(destination, asset);
  } catch (error) {
    await removeTemporaryFile(temporary);
    throw error;
  }
}

if (import.meta.main) {
  try {
    const binary = await provisionHabitatBinary();
    process.stdout.write(`${binary}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
