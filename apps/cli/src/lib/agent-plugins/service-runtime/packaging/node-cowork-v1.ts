import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import type {
  CoworkV1ArchiveRequest,
  CoworkV1Runtime,
  PackageDigest,
} from "@rawr/agent-plugin-lifecycle/ports/packaging";
import yazl from "yazl";

export const nodeCoworkV1Runtime: CoworkV1Runtime = Object.freeze({
  encode: encodeCoworkV1,
  packageDigest,
});

export function packageDigest(bytes: Uint8Array): PackageDigest {
  return `pkg1_${createHash("sha256").update(bytes).digest("hex")}`;
}

async function encodeCoworkV1(request: CoworkV1ArchiveRequest): Promise<Uint8Array> {
  const zip = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  const output = new Promise<Uint8Array>((resolve, reject) => {
    zip.on("error", reject);
    zip.outputStream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });
    zip.outputStream.once("error", reject);
    zip.outputStream.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
  });

  for (const entry of request.entries) {
    zip.addBuffer(Buffer.from(entry.bytes), entry.path, {
      compress: request.compression !== "store",
      forceDosTimestamp: true,
      forceZip64Format: request.zip64,
      mode: 0o100000 | entry.mode,
      mtime: new Date(request.fixedTimestamp),
    });
  }
  zip.end({
    forceZip64Format: request.zip64,
    comment: request.comment,
  });
  return output;
}
