import { sameGitPointer, type ExactGitBlobPointer, type GitLocator } from "../domain/git";
import type { ExactGitReader, GitReadFailure } from "../ports/index";

export type ExactReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly failure: GitReadFailure };

export async function readExactBlob(
  reader: ExactGitReader,
  locator: GitLocator,
  pointer: ExactGitBlobPointer,
): Promise<ExactReadResult> {
  const result = await reader.readBlob(locator, pointer);
  if (!result.ok) return result;
  if (!sameGitPointer(result.observation.pointer, pointer)) {
    return {
      ok: false,
      failure: {
        code: "WrongObject",
        message: "Git reader returned bytes for a different repository/ref/commit/tree/path/blob",
      },
    };
  }
  return { ok: true, bytes: result.observation.bytes };
}
