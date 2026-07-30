/** Classifies whether Graphite reports only one remaining stack branch. */
export function stackLooksConverged(gtLsOutput: string): boolean {
  const branchLines = gtLsOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("◯") || line.includes("◉"));
  return branchLines.length <= 1;
}
