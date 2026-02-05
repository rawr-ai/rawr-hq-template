import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import {
  chunkMessages,
  extractSession,
  formatTranscript,
  formatTranscriptMessagesOnly,
  resolveSession,
  writeTranscriptFileName,
  type OutputFormat,
  type RoleFilter,
  type SessionSourceFilter,
} from "@rawr/session-tools";
import { ensureDir, writeJsonFile, writeTextFile } from "../../lib/out-dir";

export default class SessionsExtract extends RawrCommand {
  static description = "Extract a session transcript";

  static args = {
    session: Args.string({ required: true, description: "Session id/prefix or path" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    source: Flags.string({
      description: "Session source",
      options: ["claude", "codex", "all"],
      default: "all",
    }),
    format: Flags.string({
      description: "Transcript output format",
      options: ["json", "text", "markdown"],
      default: "markdown",
    }),
    roles: Flags.string({
      description: "Roles to include (repeatable): user | assistant | tool | all",
      options: ["user", "assistant", "tool", "all"],
      multiple: true,
      default: ["user", "assistant"],
    }),
    "include-tools": Flags.boolean({ description: "Include tool / non-dialog events", default: false }),
    "no-dedupe": Flags.boolean({ description: "Disable message dedupe", default: false }),
    offset: Flags.integer({ description: "Skip this many messages", default: 0, min: 0 }),
    "max-messages": Flags.integer({ description: "Cap messages returned (0 = unlimited)", default: 0, min: 0, max: 500_000 }),
    "chunk-size": Flags.integer({ description: "Chunk size (0 = no chunking)", default: 0, min: 0, max: 50_000 }),
    "chunk-overlap": Flags.integer({ description: "Chunk overlap", default: 0, min: 0, max: 50_000 }),
    "chunk-output": Flags.string({
      description: "Chunk output: single stream or one file per chunk (requires --out-dir)",
      options: ["single", "split"],
      default: "single",
    }),
    "out-dir": Flags.string({ description: "Write metadata.json + transcript file(s) to a directory" }),
    quiet: Flags.boolean({ description: "Suppress human output", default: false }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(SessionsExtract);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const source = String(flags.source) as SessionSourceFilter;
    const session = String(args.session);
    const format = String(flags.format) as OutputFormat;
    const roles = (flags.roles as unknown as string[]).map(String) as RoleFilter[];
    const includeTools = Boolean(flags["include-tools"]);
    const dedupe = !Boolean(flags["no-dedupe"]);
    const offset = Number(flags.offset);
    const maxMessages = Number(flags["max-messages"]);
    const chunkSize = Number(flags["chunk-size"]);
    const chunkOverlap = Number(flags["chunk-overlap"]);
    const chunkOutput = String(flags["chunk-output"]);
    const outDir = flags["out-dir"] ? String(flags["out-dir"]) : null;

    if (chunkOutput === "split" && chunkSize > 0 && !outDir) {
      const result = this.fail("--chunk-output split requires --out-dir", { code: "MISSING_OUT_DIR" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const resolved = await resolveSession(session, source);
    if ("error" in resolved) {
      const result = this.fail(resolved.error, { code: "SESSION_NOT_FOUND" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const extracted = await extractSession(resolved.resolved.path, {
      roles,
      includeTools,
      dedupe,
      offset,
      maxMessages,
    });

    if ("error" in extracted) {
      const result = this.fail(extracted.error, { code: "EXTRACT_FAILED", meta: { path: resolved.resolved.path } });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const chunks = chunkMessages(extracted.messages, chunkSize, chunkOverlap);

    const outputs: Array<{ name: string; content: string }> = [];

    if (chunkSize > 0 && chunkOutput === "split") {
      for (let i = 0; i < chunks.length; i++) {
        const chunkTitle = `Chunk ${i + 1}/${chunks.length}`;
        const content = formatTranscriptMessagesOnly(
          { ...extracted, messages: chunks[i]!, messageCount: chunks[i]!.length },
          format,
          { includeHeader: true, chunkTitle },
        );
        outputs.push({ name: writeTranscriptFileName(format, i + 1), content });
      }
    } else if (chunkSize > 0 && chunkOutput === "single") {
      const parts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkTitle = `Chunk ${i + 1}/${chunks.length}`;
        const content = formatTranscriptMessagesOnly(
          { ...extracted, messages: chunks[i]!, messageCount: chunks[i]!.length },
          format,
          { includeHeader: i === 0, chunkTitle },
        );
        parts.push(content.trimEnd());
      }
      outputs.push({ name: writeTranscriptFileName(format), content: parts.join("\n\n") + "\n" });
    } else {
      outputs.push({ name: writeTranscriptFileName(format), content: formatTranscript(extracted, format) + "\n" });
    }

    let outFiles: string[] = [];
    if (outDir) {
      await ensureDir(outDir);
      const { messages, ...extractedMeta } = extracted;
      await writeJsonFile(outDir, "metadata.json", { resolved, extracted: extractedMeta });
      for (const o of outputs) outFiles.push(await writeTextFile(outDir, o.name, o.content));
    }

    const result = this.ok({
      resolved,
      extracted,
      outDir,
      outFiles,
      outputs: outputs.map((o) => ({ name: o.name })),
    });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (flags.quiet) return;
        if (outDir) {
          this.log(`wrote ${outputs.length} transcript file(s) to ${outDir}`);
          return;
        }
        for (const o of outputs) this.log(o.content);
      },
    });
  }
}
