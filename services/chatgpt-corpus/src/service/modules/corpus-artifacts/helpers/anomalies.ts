import type { JsonConversationSourceRecord } from "../../source-materials/entities";
import type { Anomaly } from "../entities";
import { filenameStem, slugify } from "./names";

export function detectAnomalies(jsonRecords: JsonConversationSourceRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const byHash = new Map<string, JsonConversationSourceRecord[]>();
  const byMessagesHash = new Map<string, JsonConversationSourceRecord[]>();
  const byLink = new Map<string, JsonConversationSourceRecord[]>();

  for (const record of jsonRecords) {
    const hashBucket = byHash.get(record.hash) ?? [];
    hashBucket.push(record);
    byHash.set(record.hash, hashBucket);

    const messageBucket = byMessagesHash.get(record.messagesHash) ?? [];
    messageBucket.push(record);
    byMessagesHash.set(record.messagesHash, messageBucket);

    if (record.link) {
      const linkBucket = byLink.get(record.link) ?? [];
      linkBucket.push(record);
      byLink.set(record.link, linkBucket);
    }

    const messages = record.messages;
    if (messages.length === 0) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(filenameStem(record.relativePath))}-empty-conversation`,
        type: "empty_conversation",
        source_ids: [record.sourceId],
        severity: "high",
        notes: "Conversation export contains no messages.",
      });
      continue;
    }

    const lastResponse = [...messages].reverse().find((message) => message.role === "Response")?.say ?? "";
    if (!lastResponse.trim()) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(filenameStem(record.relativePath))}-blank-final-response`,
        type: "blank_final_response",
        source_ids: [record.sourceId],
        severity: "medium",
        notes: "Final assistant response is blank in this export.",
      });
    }

    if (messages.some((message) => message.say.toLowerCase().includes("tokens truncated"))) {
      anomalies.push({
        anomaly_id: `anomaly-${slugify(filenameStem(record.relativePath))}-truncated-message`,
        type: "truncated_message",
        source_ids: [record.sourceId],
        severity: "medium",
        notes: "At least one message contains exporter truncation text.",
      });
    }
  }

  for (const [hashValue, members] of byHash.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-duplicate-hash-${hashValue.slice(0, 8)}`,
        type: "duplicate_hash",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Files share the same content hash.",
      });
    }
  }

  for (const [hashValue, members] of byMessagesHash.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-duplicate-messages-${hashValue.slice(0, 8)}`,
        type: "duplicate_messages",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Exports share identical message content even if metadata differs.",
      });
    }
  }

  for (const [linkValue, members] of byLink.entries()) {
    if (members.length > 1) {
      anomalies.push({
        anomaly_id: `anomaly-same-link-${slugify(linkValue.split("/c/").at(-1) ?? linkValue)}`,
        type: "same_conversation_link",
        source_ids: members.map((member) => member.sourceId),
        severity: "low",
        notes: "Multiple exports share the same ChatGPT conversation link.",
      });
    }
  }

  return anomalies;
}
