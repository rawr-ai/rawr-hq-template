import { listSessions, resolveSession } from "../../shared/catalog-logic";
import type { SessionSourceRuntime } from "../../shared/ports/session-source-runtime";
import type { SessionFilters, SessionSourceFilter } from "../../shared/schemas";

export function createRepository(runtime: SessionSourceRuntime) {
  return {
    async list(input: { source: SessionSourceFilter; limit: number; filters?: SessionFilters }) {
      return listSessions({ runtime, ...input });
    },
    async resolve(input: { session: string; source: SessionSourceFilter }) {
      return resolveSession({ runtime, session: input.session, source: input.source });
    },
  };
}
