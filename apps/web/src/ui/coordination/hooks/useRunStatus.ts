import { useCallback, useRef, useState } from "react";
import {
  type RunStatusV1,
  type DeskRunEventV1,
} from "@rawr/coordination";
import { coordinationClientErrorMessage, getRunStatus, getRunTimeline } from "../adapters/api-client";
import { nextBackoffMs, RUN_TERMINAL_STATES } from "../adapters/workflow-mappers";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_POLL_ATTEMPTS = 24;

export function useRunStatus() {
  const [lastRun, setLastRun] = useState<RunStatusV1 | null>(null);
  const [timeline, setTimeline] = useState<DeskRunEventV1[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenRef = useRef(0);
  const pollingTokenRef = useRef<number | null>(null);

  const nextToken = () => {
    tokenRef.current += 1;
    return tokenRef.current;
  };

  const isCurrentToken = (token: number) => token === tokenRef.current;

  const refreshRunState = useCallback(async (runId: string, token = tokenRef.current): Promise<RunStatusV1 | null> => {
    let statusResult;
    let timelineResult;
    try {
      [statusResult, timelineResult] = await Promise.all([getRunStatus(runId), getRunTimeline(runId)]);
    } catch (err) {
      if (isCurrentToken(token)) {
        setError(coordinationClientErrorMessage(err, "Failed to refresh run state"));
      }
      return null;
    }

    if (!isCurrentToken(token)) {
      return null;
    }

    if (!statusResult.run) {
      setError("Failed to load run status");
      return null;
    }

    if (!timelineResult.timeline) {
      setError("Failed to load run timeline");
      return null;
    }

    setLastRun(statusResult.run);
    setTimeline(Array.isArray(timelineResult.timeline) ? timelineResult.timeline : []);
    return statusResult.run;
  }, []);

  const pollRunUntilTerminal = useCallback(
    async (runId: string, token: number) => {
      pollingTokenRef.current = token;
      setPolling(true);

      try {
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
          const run = await refreshRunState(runId, token);
          if (!isCurrentToken(token)) return;

          if (run && RUN_TERMINAL_STATES.has(run.status)) {
            return;
          }

          if (!isCurrentToken(token)) return;
          await sleep(nextBackoffMs(attempt));
        }

        if (isCurrentToken(token)) {
          setError("Run is still in progress. Use Refresh run status to keep tracking.");
        }
      } finally {
        if (pollingTokenRef.current === token) {
          pollingTokenRef.current = null;
          setPolling(false);
        }
      }
    },
    [refreshRunState],
  );

  const trackRun = useCallback(
    async (run: RunStatusV1) => {
      const token = nextToken();
      setError(null);
      setLastRun(run);

      const refreshed = await refreshRunState(run.runId, token);
      if (!isCurrentToken(token)) return;

      const current = refreshed ?? run;
      if (RUN_TERMINAL_STATES.has(current.status)) {
        return;
      }

      await pollRunUntilTerminal(current.runId, token);
    },
    [pollRunUntilTerminal, refreshRunState],
  );

  const refreshCurrentRun = useCallback(async () => {
    if (!lastRun) return;
    const token = nextToken();
    await refreshRunState(lastRun.runId, token);
  }, [lastRun, refreshRunState]);

  return {
    lastRun,
    timeline,
    polling,
    error,
    setError,
    clearError: () => setError(null),
    refreshCurrentRun,
    trackRun,
  };
}
