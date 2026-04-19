import { detectSessionFormat } from "../../shared/normalization";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { ExtractOptions } from "../../shared/schemas";
import { extractSession } from "../../shared/transcript-logic";

export function createRepository(runtime: SessionSourceRuntime) {
  return {
    async detect(path: string) {
      return detectSessionFormat(runtime, path);
    },
    async extract(path: string, options: ExtractOptions) {
      return extractSession({ runtime, filePath: path, options });
    },
  };
}
