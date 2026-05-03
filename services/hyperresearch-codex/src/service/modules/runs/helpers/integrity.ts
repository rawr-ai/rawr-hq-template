import type {
  HyperresearchIntegrityFinding,
  HyperresearchRunLedger,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

/**
 * Estimates whether a post-synthesis report still behaves like a patch.
 *
 * This is deliberately conservative: small edits keep most snapshot lines,
 * while wholesale regeneration drops the retained-line ratio and blocks.
 */
function retainedLineRatio(snapshot: string, current: string): number {
  const snapshotLines = snapshot
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (snapshotLines.length === 0) return current.trim().length === 0 ? 1 : 0;

  const currentLines = new Set(
    current
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
  const retained = snapshotLines.filter((line) => currentLines.has(line)).length;
  return retained / snapshotLines.length;
}

function sourceUrlsInClaimTrace(value: unknown): string[] {
  const urls = new Set<string>();
  const visit = (item: unknown) => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.length > 0) urls.add(record.url);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return [...urls];
}

function claimTraceEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).claims)) {
    return (value as { claims: unknown[] }).claims;
  }
  return [];
}

function safeRelativePath(value: string): boolean {
  if (value.startsWith("/") || value.trim() !== value) return false;
  return !value.split(/[\\/]+/).includes("..");
}

function reportPathFromLocation(value: string): string {
  return value.split("#", 1)[0] ?? value;
}

function sourceObjects(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function patchLogEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).patches)) {
    return (value as { patches: unknown[] }).patches;
  }
  return [];
}

function changedLinesCovered(input: {
  snapshotText: string;
  currentReport: string;
  hunks: Array<Record<string, unknown>>;
}): boolean {
  const normalizeLines = (text: string) => text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const snapshotLines = normalizeLines(input.snapshotText);
  const currentLines = normalizeLines(input.currentReport);
  const snapshotSet = new Set(snapshotLines);
  const currentSet = new Set(currentLines);
  const removedLines = snapshotLines.filter((line) => !currentSet.has(line));
  const addedLines = currentLines.filter((line) => !snapshotSet.has(line));
  const beforeText = input.hunks
    .map((hunk) => hunk.before)
    .filter((value): value is string => typeof value === "string")
    .join("\n");
  const afterText = input.hunks
    .map((hunk) => hunk.after)
    .filter((value): value is string => typeof value === "string")
    .join("\n");
  return removedLines.every((line) => beforeText.includes(line))
    && addedLines.every((line) => afterText.includes(line));
}

async function patchLogCoversReportChange(input: {
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
  beforeSha256: string;
  afterSha256: string;
  snapshotText: string;
  currentReport: string;
}): Promise<boolean> {
  const patchLogText = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, "research", "patch-log.json"));
  if (!patchLogText) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(patchLogText);
  } catch {
    return false;
  }
  return patchLogEntries(parsed).some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const record = entry as Record<string, unknown>;
    const hunks = Array.isArray(record.hunks) ? record.hunks : [];
    return record.beforeSha256 === input.beforeSha256
      && record.afterSha256 === input.afterSha256
      && typeof record.criticId === "string"
      && record.criticId.length > 0
      && Array.isArray(record.findingIds)
      && record.findingIds.length > 0
      && record.findingIds.every((item) => typeof item === "string" && item.length > 0)
      && record.status === "accepted"
      && typeof record.rationale === "string"
      && record.rationale.length > 0
      && hunks.length > 0
      && changedLinesCovered({
        snapshotText: input.snapshotText,
        currentReport: input.currentReport,
        hunks: hunks as Array<Record<string, unknown>>,
      })
      && hunks.every((hunk) => {
        if (!hunk || typeof hunk !== "object") return false;
        const hunkRecord = hunk as Record<string, unknown>;
        if (typeof hunkRecord.section !== "string" || hunkRecord.section.length === 0) return false;
        if (typeof hunkRecord.before !== "string" || typeof hunkRecord.after !== "string") return false;
        const beforeMatches = hunkRecord.before.length === 0 || input.snapshotText.includes(hunkRecord.before);
        const afterMatches = hunkRecord.after.length === 0 || input.currentReport.includes(hunkRecord.after);
        return beforeMatches && afterMatches;
      });
  });
}

export async function validateHyperresearchRunIntegrity(input: {
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchIntegrityFinding[]> {
  const findings: HyperresearchIntegrityFinding[] = [];

  for (const step of input.ledger.steps) {
    if (step.status === "complete" && !step.loaded) {
      findings.push({
        severity: "blocking",
        code: "missing-step-load",
        stepId: step.id,
        message: `Step ${step.id} completed without a recorded fresh step load`,
      });
    }

    if (step.status === "failed" || step.status === "blocked") {
      findings.push({
        severity: "blocking",
        code: "failed-step",
        stepId: step.id,
        message: step.failure ?? `Step ${step.id} failed`,
      });
    }

    if (step.status === "complete") {
      for (const artifact of step.requiredArtifacts) {
        const artifactPath = input.io.join(input.ledger.artifactRoot, artifact);
        if (!(await input.io.pathExists(artifactPath))) {
          findings.push({
            severity: "blocking",
            code: "missing-required-artifact",
            stepId: step.id,
            artifact,
            message: `Required artifact missing for ${step.id}: ${artifact}`,
          });
        }
      }
    }
  }

  for (const call of input.ledger.cliCalls) {
    if (call.exitCode !== 0) {
      findings.push({
        severity: "blocking",
        code: "failed-cli-call",
        message: `Hyperresearch CLI call failed: ${call.operation}`,
      });
    }
  }

  for (const job of input.ledger.agentJobs ?? []) {
    if (job.status === "pending") {
      findings.push({
        severity: "warning",
        code: "awaiting-agent-output",
        stepId: job.stepId,
        message: `Agent job is awaiting output: ${job.id}`,
      });
    }
    if (job.status === "failed") {
      findings.push({
        severity: "blocking",
        code: "failed-agent-job",
        stepId: job.stepId,
        message: job.failure ?? `Agent job failed: ${job.id}`,
      });
    }
    if (job.status === "complete" && job.acceptedOutputPath && job.acceptedOutputSha256) {
      const acceptedOutput = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, job.acceptedOutputPath));
      if (acceptedOutput === null) {
        findings.push({
          severity: "blocking",
          code: "missing-agent-output",
          stepId: job.stepId,
          artifact: job.acceptedOutputPath,
          message: `Accepted agent output is missing: ${job.acceptedOutputPath}`,
        });
      } else {
        const actualSha = input.io.sha256(acceptedOutput);
        if (actualSha !== job.acceptedOutputSha256) {
          findings.push({
            severity: "blocking",
            code: "agent-output-conflict",
            stepId: job.stepId,
            artifact: job.acceptedOutputPath,
            message: `Accepted agent output hash changed for ${job.id}`,
          });
        }
      }
    }
    if (job.status === "complete") {
      if (!job.acceptedAttemptId || !job.acceptedOutputPath || !job.acceptedOutputSha256) {
        findings.push({
          severity: "blocking",
          code: "missing-agent-output-acceptance",
          stepId: job.stepId,
          message: `Completed agent job is missing accepted attempt metadata: ${job.id}`,
        });
      }
      const acceptedAttempt = job.attempts?.find((attempt) => attempt.attemptId === job.acceptedAttemptId);
      if (!acceptedAttempt) {
        findings.push({
          severity: "blocking",
          code: "missing-agent-output-acceptance",
          stepId: job.stepId,
          message: `Completed agent job is missing accepted attempt record: ${job.id}`,
        });
      } else if (acceptedAttempt.replacesAttemptId) {
        const replacedAttempt = job.attempts?.find((attempt) => attempt.attemptId === acceptedAttempt.replacesAttemptId);
        if (!replacedAttempt || replacedAttempt.status !== "non_clean" || replacedAttempt.classification === "clean_completed") {
          findings.push({
            severity: "blocking",
            code: "invalid-replacement-attempt",
            stepId: job.stepId,
            message: `Replacement attempt for ${job.id} does not preserve a non-clean replaced attempt`,
          });
        }
      }
    }
  }

  for (const disposition of input.ledger.reviewDispositions ?? []) {
    if (disposition.severity === "blocking" && disposition.status === "open") {
      findings.push({
        severity: "blocking",
        code: "open-review-finding",
        message: `Open blocking review finding: ${disposition.id}`,
      });
    }
  }

  if (input.ledger.version === 2 && input.ledger.completed) {
    const claimTracePath = "research/claim-trace.json";
    const claimTraceText = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, claimTracePath));
    if (!claimTraceText) {
      findings.push({
        severity: "blocking",
        code: "missing-claim-trace",
        artifact: claimTracePath,
        message: "Completed Hyperresearch Codex runs must include research/claim-trace.json",
      });
    } else {
      let parsedTrace: unknown;
      try {
        parsedTrace = JSON.parse(claimTraceText);
      } catch {
        findings.push({
          severity: "blocking",
          code: "missing-claim-trace",
          artifact: claimTracePath,
          message: "Claim trace is not valid JSON",
        });
      }
      if (parsedTrace !== undefined) {
        const claims = claimTraceEntries(parsedTrace);
        if (claims.length === 0) {
          findings.push({
            severity: "blocking",
            code: "missing-claim-trace",
            artifact: claimTracePath,
            message: "Claim trace must include at least one claim entry",
          });
        }
        const capturedUrls = new Set((input.ledger.sourceCaptures ?? []).map((capture) => capture.url));
        const capturedNoteIds = new Set((input.ledger.sourceCaptures ?? []).flatMap((capture) => capture.noteIds ?? []));
        const capturedSourceIds = new Set((input.ledger.sourceCaptures ?? []).flatMap((capture) => capture.sourceIds ?? []));
        for (const [index, claim] of claims.entries()) {
          const record = claim && typeof claim === "object" ? claim as Record<string, unknown> : {};
          if (typeof record.claim !== "string" || record.claim.length === 0) {
            findings.push({
              severity: "blocking",
              code: "missing-claim-trace",
              artifact: claimTracePath,
              message: `Claim trace entry ${index + 1} is missing claim text`,
            });
          }
          if (typeof record.reportLocation !== "string" || record.reportLocation.length === 0 || !safeRelativePath(reportPathFromLocation(record.reportLocation))) {
            findings.push({
              severity: "blocking",
              code: "missing-claim-trace",
              artifact: claimTracePath,
              message: `Claim trace entry ${index + 1} is missing a safe reportLocation`,
            });
          } else {
            const reportPath = reportPathFromLocation(record.reportLocation);
            const reportText = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, reportPath));
            if (!reportText) {
              findings.push({
                severity: "blocking",
                code: "missing-claim-trace",
                artifact: claimTracePath,
                message: `Claim trace entry ${index + 1} references a missing report location: ${reportPath}`,
              });
            } else if (typeof record.claim === "string" && record.claim.length > 0 && !reportText.includes(record.claim)) {
              findings.push({
                severity: "blocking",
                code: "missing-claim-trace",
                artifact: claimTracePath,
                message: `Claim trace entry ${index + 1} claim text does not appear in ${reportPath}`,
              });
            }
          }
          if (record.confidence !== "high" && record.confidence !== "medium" && record.confidence !== "low") {
            findings.push({
              severity: "blocking",
              code: "missing-claim-trace",
              artifact: claimTracePath,
              message: `Claim trace entry ${index + 1} is missing confidence`,
            });
          }
          if (typeof record.reviewerDisposition !== "string" || record.reviewerDisposition.length === 0) {
            findings.push({
              severity: "blocking",
              code: "missing-claim-trace",
              artifact: claimTracePath,
              message: `Claim trace entry ${index + 1} is missing reviewerDisposition`,
            });
          }
          const hasUncertainty = typeof record.uncertainty === "string" && record.uncertainty.length > 0;
          const sources = sourceObjects(record.sources);
          const urls = sourceUrlsInClaimTrace(sources);
          const noteIds = sources
            .map((source) => source.noteId)
            .filter((value): value is string => typeof value === "string" && value.length > 0);
          const sourceIds = sources
            .map((source) => source.sourceId)
            .filter((value): value is string => typeof value === "string" && value.length > 0);
          if (!hasUncertainty && urls.length === 0 && noteIds.length === 0 && sourceIds.length === 0) {
            findings.push({
              severity: "blocking",
              code: "missing-claim-trace",
              artifact: claimTracePath,
              message: `Claim trace entry ${index + 1} has no source, note/source id, or uncertainty`,
            });
          }
          for (const url of urls) {
            if (!capturedUrls.has(url)) {
              findings.push({
                severity: "blocking",
                code: "missing-source-capture",
                artifact: claimTracePath,
                message: `Claim trace references an uncaptured source URL: ${url}`,
              });
            }
          }
          for (const noteId of noteIds) {
            if (!capturedNoteIds.has(noteId)) {
              findings.push({
                severity: "blocking",
                code: "missing-source-capture",
                artifact: claimTracePath,
                message: `Claim trace references an uncaptured note id: ${noteId}`,
              });
            }
          }
          for (const sourceId of sourceIds) {
            if (!capturedSourceIds.has(sourceId)) {
              findings.push({
                severity: "blocking",
                code: "missing-source-capture",
                artifact: claimTracePath,
                message: `Claim trace references an uncaptured source id: ${sourceId}`,
              });
            }
          }
        }
      }
    }
  }

  for (const violation of input.ledger.patchGuard?.violations ?? []) {
    findings.push({
      severity: "blocking",
      code: "patch-only-violation",
      message: violation,
    });
  }

  const patchGuard = input.ledger.patchGuard;
  if (patchGuard?.snapshotPath && patchGuard.snapshotSha256) {
    const currentReport = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, patchGuard.snapshotPath));
    if (currentReport) {
      const currentSha = input.io.sha256(currentReport);
      if (currentSha !== patchGuard.snapshotSha256) {
        const snapshot = [...(input.ledger.reportSnapshots ?? [])].reverse()
          .find((item) => item.sha256 === patchGuard.snapshotSha256);
        const snapshotText = snapshot
          ? await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, snapshot.path))
          : null;

        if (!snapshotText) {
          findings.push({
            severity: "blocking",
            code: "patch-only-violation",
            message: `Final report changed after snapshot but snapshot copy is missing: ${patchGuard.snapshotPath}`,
          });
        } else if (retainedLineRatio(snapshotText, currentReport) < 0.5) {
          findings.push({
            severity: "blocking",
            code: "patch-only-violation",
            message: `Final report appears to be a wholesale rewrite after snapshot: ${patchGuard.snapshotPath}`,
          });
        }
        if (!await patchLogCoversReportChange({
          ledger: input.ledger,
          io: input.io,
          beforeSha256: patchGuard.snapshotSha256,
          afterSha256: currentSha,
          snapshotText: snapshotText ?? "",
          currentReport,
        })) {
          findings.push({
            severity: "blocking",
            code: "patch-only-violation",
            message: `Final report changed after snapshot without a covering research/patch-log.json entry: ${patchGuard.snapshotPath}`,
          });
        }
      }
    }
  }

  if (!input.ledger.completed) {
    findings.push({
      severity: "warning",
      code: "incomplete-run",
      message: "Hyperresearch Codex run has not completed all steps",
    });
  }

  return findings;
}
