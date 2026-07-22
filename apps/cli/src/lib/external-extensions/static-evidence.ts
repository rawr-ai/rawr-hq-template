import { constants } from "node:fs";
import { type FileHandle, lstat, open, realpath } from "node:fs/promises";

export const MAX_STATIC_EVIDENCE_TEXT_BYTES = 1024 * 1024;

export type StaticEvidenceFailure = {
  kind: "missing" | "unreadable";
  message: string;
};

export type StaticEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StaticEvidenceFailure };

export interface StaticEvidencePort {
  canonicalPath(path: string): Promise<StaticEvidenceResult<string>>;
  isDirectory(path: string): Promise<StaticEvidenceResult<boolean>>;
  isFile(path: string): Promise<StaticEvidenceResult<boolean>>;
  readText(path: string): Promise<StaticEvidenceResult<string>>;
}

export class NodeStaticEvidencePort implements StaticEvidencePort {
  async canonicalPath(path: string): Promise<StaticEvidenceResult<string>> {
    try {
      return { ok: true, value: await realpath(path) };
    } catch (error) {
      return evidenceFailure(error, `Unable to resolve ${path}`);
    }
  }

  async isFile(path: string): Promise<StaticEvidenceResult<boolean>> {
    try {
      return { ok: true, value: (await lstat(path)).isFile() };
    } catch (error) {
      return evidenceFailure(error, `Unable to inspect ${path}`);
    }
  }

  async isDirectory(path: string): Promise<StaticEvidenceResult<boolean>> {
    try {
      return { ok: true, value: (await lstat(path)).isDirectory() };
    } catch (error) {
      return evidenceFailure(error, `Unable to inspect ${path}`);
    }
  }

  async readText(path: string): Promise<StaticEvidenceResult<string>> {
    let handle: FileHandle | undefined;
    try {
      handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      const status = await handle.stat();
      if (!status.isFile() || status.size > MAX_STATIC_EVIDENCE_TEXT_BYTES) {
        throw new Error(
          `Static evidence must be a regular file no larger than ${MAX_STATIC_EVIDENCE_TEXT_BYTES} bytes`
        );
      }
      const bytes = await handle.readFile();
      if (bytes.byteLength > MAX_STATIC_EVIDENCE_TEXT_BYTES) {
        throw new Error(
          `Static evidence exceeded ${MAX_STATIC_EVIDENCE_TEXT_BYTES} bytes while reading`
        );
      }
      return { ok: true, value: bytes.toString("utf8") };
    } catch (error) {
      return evidenceFailure(error, `Unable to read ${path}`);
    } finally {
      await handle?.close();
    }
  }
}

function evidenceFailure<T>(error: unknown, prefix: string): StaticEvidenceResult<T> {
  const code = errorCode(error);
  return {
    ok: false,
    error: {
      kind: code === "ENOENT" || code === "ENOTDIR" ? "missing" : "unreadable",
      message: `${prefix}: ${errorMessage(error)}`,
    },
  };
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
