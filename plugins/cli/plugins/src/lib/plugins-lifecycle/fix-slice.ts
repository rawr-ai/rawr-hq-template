function toBranchToken(input: string): string {
  const token = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return token.length > 0 ? token : "change";
}

function utcTimestamp(now: Date): string {
  const y = String(now.getUTCFullYear()).padStart(4, "0");
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
}

export function buildFixSliceBranchName(args: { baseBranch: string; changeUnitId: string; now?: Date }): string {
  const baseBranch = args.baseBranch.trim().length > 0 ? args.baseBranch.trim() : "branch";
  const changeToken = toBranchToken(args.changeUnitId).slice(0, 48);
  return `${baseBranch}-fix-${changeToken}-${utcTimestamp(args.now ?? new Date())}`;
}
