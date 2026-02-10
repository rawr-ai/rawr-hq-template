import fs from "node:fs/promises";
import path from "node:path";
import type {
  CoordinationWorkflowV1,
  DeskMemoryRecordV1,
  DeskRunEventV1,
  RunStatusV1,
} from "./types";

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
  return readJsonFile<CoordinationWorkflowV1>(path.join(workflowsDir(repoRoot), `${workflowId}.json`));
}

export async function saveWorkflow(repoRoot: string, workflow: CoordinationWorkflowV1): Promise<void> {
  const enriched: CoordinationWorkflowV1 = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(path.join(workflowsDir(repoRoot), `${workflow.workflowId}.json`), enriched);
}

export async function getRunStatus(repoRoot: string, runId: string): Promise<RunStatusV1 | null> {
  return readJsonFile<RunStatusV1>(path.join(runsDir(repoRoot), `${runId}.json`));
}

export async function saveRunStatus(repoRoot: string, run: RunStatusV1): Promise<void> {
  await writeJsonFile(path.join(runsDir(repoRoot), `${run.runId}.json`), run);
}

export async function getRunTimeline(repoRoot: string, runId: string): Promise<DeskRunEventV1[]> {
  const timeline = await readJsonFile<DeskRunEventV1[]>(path.join(timelinesDir(repoRoot), `${runId}.json`));
  return timeline ?? [];
}

export async function appendRunTimelineEvent(repoRoot: string, runId: string, event: DeskRunEventV1): Promise<void> {
  const current = await getRunTimeline(repoRoot, runId);
  current.push(event);
  current.sort((a, b) => a.ts.localeCompare(b.ts));
  await writeJsonFile(path.join(timelinesDir(repoRoot), `${runId}.json`), current);
}

export async function readDeskMemory(
  repoRoot: string,
  workflowId: string,
  workflowVersion: number,
  deskId: string,
): Promise<DeskMemoryRecordV1 | null> {
  const p = path.join(memoryDir(repoRoot), workflowId, `${deskId}.json`);
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

  await writeJsonFile(path.join(memoryDir(repoRoot), workflowId, `${deskId}.json`), record);
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
