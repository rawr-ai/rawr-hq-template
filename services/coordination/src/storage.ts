import fs from "node:fs/promises";
import path from "node:path";
import type {
  CoordinationWorkflowV1,
  DeskMemoryRecordV1,
  DeskRunEventV1,
  RunStatusV1,
} from "./types";
import { assertSafeCoordinationId } from "./ids";

const RAWR_COORD_ROOT = [".rawr", "coordination"] as const;

function baseDir(repoRoot: string): string {
  return path.join(repoRoot, ...RAWR_COORD_ROOT);
}

function workflowsDir(repoRoot: string): string {
  return path.join(baseDir(repoRoot), "workflows");
}

function runsDir(repoRoot: string): string {
  return path.join(baseDir(repoRoot), "runs");
}

function timelinesDir(repoRoot: string): string {
  return path.join(baseDir(repoRoot), "timelines");
}

function memoryDir(repoRoot: string): string {
  return path.join(baseDir(repoRoot), "memory");
}

const runTimelineLocks = new Map<string, Promise<void>>();

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function writeJsonFile<T>(p: string, payload: T): Promise<void> {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
}

async function readJsonFile<T>(p: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function withRunTimelineLock<T>(runId: string, task: () => Promise<T>): Promise<T> {
  const previous = runTimelineLocks.get(runId) ?? Promise.resolve();
  let releaseCurrent: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const nextTail = previous.then(() => current);
  runTimelineLocks.set(runId, nextTail);

  await previous;
  try {
    return await task();
  } finally {
    releaseCurrent();
    if (runTimelineLocks.get(runId) === nextTail) {
      runTimelineLocks.delete(runId);
    }
  }
}

function workflowFilePath(repoRoot: string, workflowId: string): string {
  const safeWorkflowId = assertSafeCoordinationId(workflowId, "workflowId");
  return path.join(workflowsDir(repoRoot), `${safeWorkflowId}.json`);
}

function runFilePath(repoRoot: string, runId: string): string {
  const safeRunId = assertSafeCoordinationId(runId, "runId");
  return path.join(runsDir(repoRoot), `${safeRunId}.json`);
}

function timelineFilePath(repoRoot: string, runId: string): string {
  const safeRunId = assertSafeCoordinationId(runId, "runId");
  return path.join(timelinesDir(repoRoot), `${safeRunId}.json`);
}

function deskMemoryPath(repoRoot: string, workflowId: string, deskId: string): string {
  const safeWorkflowId = assertSafeCoordinationId(workflowId, "workflowId");
  const safeDeskId = assertSafeCoordinationId(deskId, "deskId");
  return path.join(memoryDir(repoRoot), safeWorkflowId, `${safeDeskId}.json`);
}

export async function listWorkflows(repoRoot: string): Promise<CoordinationWorkflowV1[]> {
  const dir = workflowsDir(repoRoot);
  try {
    const files = await fs.readdir(dir);
    const workflows: CoordinationWorkflowV1[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const workflow = await readJsonFile<CoordinationWorkflowV1>(path.join(dir, file));
      if (workflow) workflows.push(workflow);
    }
    workflows.sort((a, b) => a.workflowId.localeCompare(b.workflowId));
    return workflows;
  } catch {
    return [];
  }
}

export async function getWorkflow(repoRoot: string, workflowId: string): Promise<CoordinationWorkflowV1 | null> {
  return readJsonFile<CoordinationWorkflowV1>(workflowFilePath(repoRoot, workflowId));
}

export async function saveWorkflow(repoRoot: string, workflow: CoordinationWorkflowV1): Promise<void> {
  const enriched: CoordinationWorkflowV1 = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(workflowFilePath(repoRoot, workflow.workflowId), enriched);
}

export async function getRunStatus(repoRoot: string, runId: string): Promise<RunStatusV1 | null> {
  return readJsonFile<RunStatusV1>(runFilePath(repoRoot, runId));
}

export async function saveRunStatus(repoRoot: string, run: RunStatusV1): Promise<void> {
  await writeJsonFile(runFilePath(repoRoot, run.runId), run);
}

export async function getRunTimeline(repoRoot: string, runId: string): Promise<DeskRunEventV1[]> {
  const timeline = await readJsonFile<DeskRunEventV1[]>(timelineFilePath(repoRoot, runId));
  return timeline ?? [];
}

export async function appendRunTimelineEvent(repoRoot: string, runId: string, event: DeskRunEventV1): Promise<void> {
  const safeRunId = assertSafeCoordinationId(runId, "runId");
  await withRunTimelineLock(safeRunId, async () => {
    const current = await getRunTimeline(repoRoot, safeRunId);
    current.push(event);
    current.sort((a, b) => a.ts.localeCompare(b.ts));
    await writeJsonFile(timelineFilePath(repoRoot, safeRunId), current);
  });
}

export async function readDeskMemory(
  repoRoot: string,
  workflowId: string,
  workflowVersion: number,
  deskId: string,
): Promise<DeskMemoryRecordV1 | null> {
  const p = deskMemoryPath(repoRoot, workflowId, deskId);
  const record = await readJsonFile<DeskMemoryRecordV1>(p);
  if (!record) return null;

  if (record.expiresAt && record.expiresAt <= new Date().toISOString()) {
    return null;
  }

  if (record.workflowVersion !== workflowVersion) {
    return null;
  }

  return record;
}

export async function writeDeskMemory(
  repoRoot: string,
  workflowId: string,
  workflowVersion: number,
  deskId: string,
  memoryKey: string,
  data: DeskMemoryRecordV1["data"],
  ttlSeconds?: number,
): Promise<DeskMemoryRecordV1> {
  const updatedAt = new Date().toISOString();
  const expiresAt =
    typeof ttlSeconds === "number" && ttlSeconds > 0
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : undefined;

  const record: DeskMemoryRecordV1 = {
    workflowId,
    workflowVersion,
    deskId,
    memoryKey,
    data,
    updatedAt,
    expiresAt,
  };

  await writeJsonFile(deskMemoryPath(repoRoot, workflowId, deskId), record);
  return record;
}

export async function ensureCoordinationStorage(repoRoot: string): Promise<void> {
  await Promise.all([
    ensureDir(workflowsDir(repoRoot)),
    ensureDir(runsDir(repoRoot)),
    ensureDir(timelinesDir(repoRoot)),
    ensureDir(memoryDir(repoRoot)),
  ]);
}
