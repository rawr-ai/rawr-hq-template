import { writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { TarballStaticEvidencePort } from "../../src/lib/external-extensions/tar-static-evidence";
import { removeFixtureRoots, tempRoot } from "./fixtures";

afterEach(removeFixtureRoots);

describe("tarball static evidence", () => {
  it("rejects a file that is later reused as a child path parent", async () => {
    const artifact = path.join(tempRoot("archive-impossible-parent"), "candidate.tar");
    writeFileSync(
      artifact,
      Buffer.concat([
        tarFile("package/dist", "parent is a file"),
        tarFile("package/dist/commands/run.js", "export default class Run {}"),
        Buffer.alloc(1024),
      ])
    );

    await expect(TarballStaticEvidencePort.read(artifact, "a".repeat(64))).rejects.toThrow(
      "EXTERNAL_EXTENSION_ARCHIVE_PATH_DUPLICATE"
    );
  });
});

function tarFile(name: string, contents: string): Buffer {
  const body = Buffer.from(contents);
  const header = Buffer.alloc(512);
  writeField(header, 0, 100, name);
  writeField(header, 100, 8, "0000644\0");
  writeField(header, 108, 8, "0000000\0");
  writeField(header, 116, 8, "0000000\0");
  writeField(header, 124, 12, `${body.length.toString(8).padStart(11, "0")}\0`);
  writeField(header, 136, 12, "00000000000\0");
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeField(header, 257, 6, "ustar\0");
  writeField(header, 263, 2, "00");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeField(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([header, body, padding]);
}

function writeField(buffer: Buffer, offset: number, length: number, value: string): void {
  const bytes = Buffer.from(value);
  if (bytes.length > length) throw new Error(`tar field is too long: ${value}`);
  bytes.copy(buffer, offset);
}
