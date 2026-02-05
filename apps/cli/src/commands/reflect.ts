import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { openJournalDb, tailSnippets } from "@rawr/journal";
import { findWorkspaceRoot } from "../lib/workspace-plugins";

type ReflectSuggestion = {
  kind: "promote-workflow" | "promote-command" | "note";
  title: string;
  rationale: string;
  evidenceSnippetIds?: string[];
  exampleCommand?: string;
};

export default class Reflect extends RawrCommand {
  static description = "Suggest durable commands/workflows based on recent activity";

  static flags = {
    ...RawrCommand.baseFlags,
    limit: Flags.integer({ description: "Snippets to consider", default: 50, min: 5, max: 500 }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(Reflect);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const limit = Number(flags.limit);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const db = openJournalDb(workspaceRoot);
    try {
      const snippets = tailSnippets(db, Number.isFinite(limit) ? limit : 50);
      const suggestions = suggest(snippets);
      const result = this.ok({ suggestions, considered: snippets.length });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          if (suggestions.length === 0) {
            this.log("No suggestions yet. Keep journaling; then try `rawr journal search --query <q>`.");
            return;
          }
          for (const s of suggestions) {
            this.log(`- ${s.title}`);
            this.log(`  ${s.rationale}`);
            if (s.exampleCommand) this.log(`  e.g. ${s.exampleCommand}`);
          }
        },
      });
    } finally {
      db.close();
    }
  }
}

function suggest(snippets: Array<{ id: string; kind: string; tags: string[]; title: string }>): ReflectSuggestion[] {
  const commandCounts = new Map<string, { count: number; ids: string[] }>();

  for (const s of snippets) {
    if (s.kind !== "command") continue;
    const commandId = s.tags.find((t) => t !== "command");
    if (!commandId) continue;
    const entry = commandCounts.get(commandId) ?? { count: 0, ids: [] };
    entry.count += 1;
    if (entry.ids.length < 10) entry.ids.push(s.id);
    commandCounts.set(commandId, entry);
  }

  const suggestions: ReflectSuggestion[] = [];
  for (const [commandId, info] of [...commandCounts.entries()].sort((a, b) => b[1].count - a[1].count)) {
    if (info.count < 3) continue;
    suggestions.push({
      kind: "promote-workflow",
      title: `You ran '${commandId}' ${info.count}x recently`,
      rationale:
        "If this is a repeatable routine, consider wrapping it as a workflow command so it becomes a single, reliable entrypoint.",
      evidenceSnippetIds: info.ids,
      exampleCommand: `rawr factory workflow new ${commandId}-loop --description \"Automate my ${commandId} loop\" --yes`,
    });
  }

  if (suggestions.length === 0 && snippets.length > 0) {
    suggestions.push({
      kind: "note",
      title: "Journal is active",
      rationale: "Try `rawr journal search --query security` or `rawr journal tail --limit 10` to retrieve atomic snippets.",
    });
  }

  return suggestions.slice(0, 10);
}
