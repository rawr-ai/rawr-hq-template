import { expect, test, type Page, type Route } from "@playwright/test";
import type { CoordinationWorkflowV1, RunStatusV1 } from "@rawr/coordination";

const validWorkflow: CoordinationWorkflowV1 = {
  workflowId: "wf-visual",
  version: 1,
  name: "Visual Workflow",
  description: "Visual test workflow",
  entryDeskId: "desk-a",
  desks: [
    {
      deskId: "desk-a",
      kind: "desk:analysis",
      name: "Desk A",
      responsibility: "Analyze",
      domain: "coordination",
      inputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
      outputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
      memoryScope: { persist: true },
    },
    {
      deskId: "desk-b",
      kind: "desk:execution",
      name: "Desk B",
      responsibility: "Execute",
      domain: "coordination",
      inputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
      outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
      memoryScope: { persist: false },
    },
  ],
  handoffs: [{ handoffId: "h1", fromDeskId: "desk-a", toDeskId: "desk-b" }],
};

const invalidWorkflow: CoordinationWorkflowV1 = {
  workflowId: "wf-invalid-visual",
  version: 1,
  name: "Invalid Visual Workflow",
  description: "Intentionally invalid",
  entryDeskId: "desk-missing",
  desks: [],
  handoffs: [],
};

function jsonResponse(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

function runActionButton(page: Page) {
  return page.locator("button").filter({ hasText: /^(Run|Save \+ Run|Running…)$/ }).first();
}

async function installMockCoordinationApi(
  page: Page,
  input?: {
    invalid?: boolean;
    runFailure?: boolean;
    onRequest?: (key: "save" | "run" | "validate" | "list") => void;
  },
) {
  const workflow = input?.invalid ? invalidWorkflow : validWorkflow;
  let mutableWorkflow: CoordinationWorkflowV1 = JSON.parse(JSON.stringify(workflow)) as CoordinationWorkflowV1;
  let runStatusChecks = 0;

  await page.route("**/rawr/coordination/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === "GET" && path === "/rawr/coordination/workflows") {
      input?.onRequest?.("list");
      return jsonResponse(route, { ok: true, workflows: [mutableWorkflow] });
    }

    if (method === "POST" && path === "/rawr/coordination/workflows") {
      input?.onRequest?.("save");
      const body = request.postDataJSON() as { workflow?: CoordinationWorkflowV1 } | null;
      if (body?.workflow) {
        mutableWorkflow = body.workflow;
      }
      return jsonResponse(route, { ok: true, workflow: mutableWorkflow });
    }

    if (method === "POST" && path.endsWith("/validate")) {
      input?.onRequest?.("validate");
      return jsonResponse(route, {
        ok: true,
        workflowId: mutableWorkflow.workflowId,
        validation: input?.invalid
          ? { ok: false, errors: [{ code: "MISSING_ENTRY_DESK", message: "Entry desk not found" }] }
          : { ok: true, errors: [] },
      });
    }

    if (method === "POST" && path.endsWith("/run")) {
      input?.onRequest?.("run");
      if (input?.runFailure) {
        return jsonResponse(
          route,
          {
            ok: false,
            error: {
              code: "RUN_QUEUE_FAILED",
              message: "Run queue failed for visual test",
              retriable: true,
            },
          },
          500,
        );
      }
      const run: RunStatusV1 = {
        runId: "run-visual-1",
        workflowId: mutableWorkflow.workflowId,
        workflowVersion: mutableWorkflow.version,
        status: "queued",
        startedAt: "2026-02-12T00:00:00.000Z",
        input: { payload: "manual-run" },
        traceLinks: [
          { provider: "rawr", label: "RAWR Timeline", url: "https://example.com/timeline" },
          { provider: "inngest", label: "Inngest Trace", url: "https://example.com/inngest" },
        ],
      };
      return jsonResponse(route, { ok: true, run, eventIds: ["evt-visual-1"] });
    }

    if (method === "GET" && path.endsWith("/timeline")) {
      return jsonResponse(route, {
        ok: true,
        runId: "run-visual-1",
        timeline: [
          {
            eventId: "evt-started",
            runId: "run-visual-1",
            workflowId: mutableWorkflow.workflowId,
            type: "run.started",
            ts: "2026-02-12T00:00:01.000Z",
            status: "running",
          },
          {
            eventId: "evt-completed",
            runId: "run-visual-1",
            workflowId: mutableWorkflow.workflowId,
            type: "run.completed",
            ts: "2026-02-12T00:00:02.000Z",
            status: "completed",
          },
        ],
      });
    }

    if (method === "GET" && path.includes("/rawr/coordination/runs/")) {
      runStatusChecks += 1;
      const status: RunStatusV1["status"] = runStatusChecks >= 2 ? "completed" : "running";
      return jsonResponse(route, {
        ok: true,
        run: {
          runId: "run-visual-1",
          workflowId: mutableWorkflow.workflowId,
          workflowVersion: mutableWorkflow.version,
          status,
          startedAt: "2026-02-12T00:00:00.000Z",
          finishedAt: status === "completed" ? "2026-02-12T00:00:02.000Z" : undefined,
          input: { payload: "manual-run" },
          traceLinks: [
            { provider: "rawr", label: "RAWR Timeline", url: "https://example.com/timeline" },
            { provider: "inngest", label: "Inngest Trace", url: "https://example.com/inngest" },
          ],
        },
      });
    }

    return route.abort();
  });
}

test("default state", async ({ page }) => {
  await installMockCoordinationApi(page);
  await page.goto("/coordination");
  await expect(page.getByRole("heading", { name: "Agent Coordination Canvas" })).toBeVisible();
  await expect(page).toHaveScreenshot("coordination-default.png", { fullPage: true });
});

test("command palette open state", async ({ page }) => {
  await installMockCoordinationApi(page);
  await page.goto("/coordination");
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );
  });
  await expect(page.getByRole("heading", { name: "Command Palette" })).toBeVisible();
  await expect(page).toHaveScreenshot("coordination-command-palette.png", { fullPage: true });
});

test("validation error state", async ({ page }) => {
  await installMockCoordinationApi(page, { invalid: true });
  await page.goto("/coordination");
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("coordination-validation-error.png", { fullPage: true });
});

test("run timeline state", async ({ page }) => {
  await installMockCoordinationApi(page);
  await page.goto("/coordination");
  await runActionButton(page).click();
  await expect(page.getByText("run.completed")).toBeVisible();
  await expect(page).toHaveScreenshot("coordination-run-timeline.png", { fullPage: true });
});

test("run error state", async ({ page }) => {
  await installMockCoordinationApi(page, { runFailure: true });
  await page.goto("/coordination");
  await runActionButton(page).click();
  await expect(page.getByText("Error: Run queue failed for visual test")).toBeVisible();
  await expect(page).toHaveScreenshot("coordination-run-error.png", { fullPage: true });
});

test("run action saves dirty workflow before enqueue", async ({ page }, testInfo) => {
  test.skip(/mobile/i.test(testInfo.project.name), "Side panel editing flow is desktop-only.");

  const requestOrder: string[] = [];
  await installMockCoordinationApi(page, {
    onRequest: (key) => requestOrder.push(key),
  });

  await page.goto("/coordination");
  await page.getByLabel("Name").fill("Visual Workflow Updated");
  await runActionButton(page).click();
  await expect(page.getByText("run.completed")).toBeVisible();

  const saveIndex = requestOrder.indexOf("save");
  const runIndex = requestOrder.indexOf("run");
  expect(saveIndex).toBeGreaterThan(-1);
  expect(runIndex).toBeGreaterThan(saveIndex);
});

test("accessibility contract: keyboard, live region, and reduced-motion hook", async ({ page }) => {
  await installMockCoordinationApi(page);
  await page.goto("/coordination");

  const runButton = runActionButton(page);
  await runButton.focus();
  await expect(runButton).toBeFocused();

  const liveRegion = page.locator("[aria-live='polite']");
  await expect(liveRegion).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("heading", { name: "Command Palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Command Palette" })).toBeHidden();

  const hasReducedMotionRule = await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule.cssText.includes("prefers-reduced-motion")) {
          return true;
        }
      }
    }
    return false;
  });

  expect(hasReducedMotionRule).toBe(true);
});
