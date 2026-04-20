export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function filename(relativePath: string): string {
  return relativePath.split("/").at(-1) ?? relativePath;
}

export function filenameStem(relativePath: string): string {
  const name = filename(relativePath);
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(0, dot) : name;
}

export function parseDate(value: string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const normalized = value.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$1-$2");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}
