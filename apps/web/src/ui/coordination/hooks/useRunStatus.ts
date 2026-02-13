import { useCallback, useRef, useState } from "react";
import {
  coordinationErrorMessage,
  type RunStatusV1,
  type DeskRunEventV1,
} from "@rawr/coordination";
import { getRunStatus, getRunTimeline } from "../adapters/api-client";
import { nextBackoffMs, RUN_TERMINAL_STATES } from "../adapters/workflow-mappers";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const [runResult, timelineResult] = await Promise.all([getRunStatus(runId), getRunTimeline(runId)]);

    if (!isCurrentToken(token)) {
      return null;
    }

    if (runResult.ok !== true) {
      setError(coordinationErrorMessage(runResult, "Failed to load run status"));
      return null;
    }

    if (timelineResult.ok !== true) {
      setError(coordinationErrorMessage(timelineResult, "Failed to load run timeline"));
      return null;
    }

    setLastRun(runResult.run);
    setTimeline(Array.isArray(timelineResult.timeline) ? timelineResult.timeline : []);
    return runResult.run;
  }, []);

  const pollRunUntilTerminal = useCallback(
    async (runId: string, token: number) => {
      pollingTokenRef.current = token;
      setPolling(true);

      try {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const run = await refreshRunState(runId, token);
          if (!isCurrentToken(token)) return;

          if (run && RUN_TERMINAL_STATES.has(run.status)) {
            return;
          }

          await sleep(nextBackoffMs(attempt));
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
