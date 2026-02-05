export function journalId(now = new Date()): string {
  const ts = now.toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(16).slice(2, 10);
  return `${ts}-${process.pid}-${rand}`;
}

export function safePreview(s: string, maxLen = 200): string {
  const oneLine = s.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}

