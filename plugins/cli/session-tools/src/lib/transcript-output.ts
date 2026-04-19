import { chunkMessages, formatTranscript, formatTranscriptMessagesOnly, writeTranscriptFileName } from "./format";
import type { ExtractedSession, OutputFormat } from "./session-types";

export type TranscriptOutput = {
  name: string;
  content: string;
};

export function buildTranscriptOutputs(input: {
  extracted: ExtractedSession;
  format: OutputFormat;
  chunkSize: number;
  chunkOverlap: number;
  chunkOutput: string;
}): TranscriptOutput[] {
  const { extracted, format, chunkSize, chunkOverlap, chunkOutput } = input;
  const outputs: TranscriptOutput[] = [];
  const chunks = chunkMessages(extracted.messages, chunkSize, chunkOverlap);

  if (chunkSize > 0 && chunkOutput === "split") {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const chunkTitle = `Chunk ${i + 1}/${chunks.length}`;
      const content = formatTranscriptMessagesOnly(
        { ...extracted, messages: chunk, messageCount: chunk.length },
        format,
        { includeHeader: true, chunkTitle },
      );
      outputs.push({ name: writeTranscriptFileName(format, i + 1), content });
    }
    return outputs;
  }

  if (chunkSize > 0 && chunkOutput === "single") {
    const parts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const chunkTitle = `Chunk ${i + 1}/${chunks.length}`;
      const content = formatTranscriptMessagesOnly(
        { ...extracted, messages: chunk, messageCount: chunk.length },
        format,
        { includeHeader: i === 0, chunkTitle },
      );
      parts.push(content.trimEnd());
    }
    outputs.push({ name: writeTranscriptFileName(format), content: `${parts.join("\n\n")}\n` });
    return outputs;
  }

  outputs.push({ name: writeTranscriptFileName(format), content: `${formatTranscript(extracted, format)}\n` });
  return outputs;
}

