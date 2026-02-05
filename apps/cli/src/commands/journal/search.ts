import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { isSemanticConfigured, openJournalDb, searchSnippetsFts, searchSnippetsSemantic } from "@rawr/journal";
import { loadRawrConfig } from "@rawr/control-plane";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class JournalSearch extends RawrCommand {
  static description = "Search journal snippets";

  static flags = {
    ...RawrCommand.baseFlags,
    query: Flags.string({ description: "FTS query", required: true }),
    limit: Flags.integer({ description: "Max snippets to return", default: 10, min: 1, max: 15 }),
    semantic: Flags.boolean({
      description: "Semantic search (optional; falls back to keyword search if unavailable)",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(JournalSearch);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const query = String(flags.query);
    const limit = Number(flags.limit);
    const semantic = Boolean(flags.semantic);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const warnings: string[] = [];
    const semanticConfigured = semantic && isSemanticConfigured();
    if (semantic && !semanticConfigured)
      warnings.push("semantic search not configured; falling back to keyword search");

    let semanticCandidateLimit: number | undefined;
    let semanticEnv: NodeJS.ProcessEnv | undefined;
    if (semanticConfigured) {
      const loaded = await loadRawrConfig(workspaceRoot);
      semanticCandidateLimit = loaded.config?.journal?.semantic?.candidateLimit ?? 200;
      const model = loaded.config?.journal?.semantic?.model;
      if (model) semanticEnv = { ...process.env, RAWR_EMBEDDINGS_MODEL: model };
    }

    const db = openJournalDb(workspaceRoot);
    try {
      const snippets = semanticConfigured
        ? await searchSnippetsSemantic(db, query, Number.isFinite(limit) ? limit : 10, {
            candidateLimit: semanticCandidateLimit,
            env: semanticEnv,
          })
        : searchSnippetsFts(db, query, Number.isFinite(limit) ? limit : 10);
      const result = this.ok({ query, snippets }, undefined, warnings.length ? warnings : undefined);
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          if (warnings.length) for (const w of warnings) this.warn(w);
          for (const s of snippets) {
            const score = typeof (s as any).score === "number" ? ` score=${(s as any).score.toFixed(3)}` : "";
            this.log(`${s.id}  ${s.title}  (${s.preview})${score}`);
          }
        },
      });
    } finally {
      db.close();
    }
  }
}
