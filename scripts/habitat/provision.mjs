import { createHash, randomUUID } from "node:crypto";
import { constants, createReadStream, createWriteStream } from "node:fs";
import { access, chmod, mkdir, rename, stat, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST_PATH = fileURLToPath(new URL("./release.json", import.meta.url));

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Habitat release manifest requires ${field}`);
  }
  return value;
}

function requireInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Habitat release manifest requires a positive integer ${field}`);
  }
  return value;
}

export function parseReleaseManifest(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Habitat release manifest must be an object");
  }
  const manifest = value;
  if (manifest.schemaVersion !== 1) {
    throw new Error("Habitat release manifest schemaVersion must be 1");
  }
  const owner = manifest.owner;
  const build = manifest.build;
  const release = manifest.release;
  const assets = manifest.assets;
  if (!owner || !build || !release || !assets) {
    throw new Error("Habitat release manifest is incomplete");
  }
  const normalizedAssets = {};
  for (const key of ["darwin-arm64", "linux-x64"]) {
    const asset = assets[key];
    if (!asset) throw new Error(`Habitat release manifest requires assets.${key}`);
    const sha256 = requireString(asset.sha256, `assets.${key}.sha256`);
    if (!/^[a-f0-9]{64}$/u.test(sha256)) {
      throw new Error(`Habitat release manifest has an invalid assets.${key}.sha256`);
    }
    normalizedAssets[key] = Object.freeze({
      filename: requireString(asset.filename, `assets.${key}.filename`),
      bytes: requireInteger(asset.bytes, `assets.${key}.bytes`),
      sha256,
    });
  }
  return Object.freeze({
    schemaVersion: 1,
    owner: Object.freeze({
      repository: requireString(owner.repository, "owner.repository"),
      sourceCommit: requireString(owner.sourceCommit, "owner.sourceCommit"),
      habitatTree: requireString(owner.habitatTree, "owner.habitatTree"),
    }),
    build: Object.freeze({
      bunVersion: requireString(build.bunVersion, "build.bunVersion"),
      bunRevision: requireString(build.bunRevision, "build.bunRevision"),
    }),
    release: Object.freeze({ tag: requireString(release.tag, "release.tag") }),
    assets: Object.freeze(normalizedAssets),
  });
}

export function selectReleaseAsset(manifest, platform = process.platform, arch = process.arch) {
  const key = `${platform}-${arch}`;
  const asset = manifest.assets[key];
  if (!asset) {
    throw new Error(`Habitat standalone check is unavailable for ${key}`);
  }
  return asset;
}

export async function sha256File(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}

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

async function readManifest() {
  return parseReleaseManifest(await Bun.file(MANIFEST_PATH).json());
}

function releaseAssetUrl(manifest, asset) {
  const repository = encodeURI(manifest.owner.repository);
  const tag = encodeURIComponent(manifest.release.tag);
  const filename = encodeURIComponent(asset.filename);
  return `https://github.com/${repository}/releases/download/${tag}/${filename}`;
}

async function removeTemporaryFile(filename) {
  try {
    await unlink(filename);
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) throw error;
  }
}

async function downloadAsset(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || response.body === null) {
    throw new Error(`Habitat asset download failed with HTTP ${response.status}`);
  }
  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination, { flags: "wx", mode: 0o755 }),
  );
}

export async function provisionHabitatBinary(options = {}) {
  const manifest = options.manifest ?? await readManifest();
  const asset = selectReleaseAsset(
    manifest,
    options.platform ?? process.platform,
    options.arch ?? process.arch,
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

  const cacheRoot = options.cacheRoot
    ?? join(REPOSITORY_ROOT, ".habitat", "cache", "bin", asset.sha256);
  const destination = join(cacheRoot, asset.filename);
  try {
    await verifyReleaseAsset(destination, asset);
    await chmod(destination, 0o755);
    return destination;
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
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
      if (!(error && typeof error === "object" && error.code === "ENOENT")) {
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
