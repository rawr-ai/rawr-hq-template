import { advanceV8Run } from "./router/advance-v8-run";
import { inspectV8Run } from "./router/inspect-v8-run";
import { startV8Run } from "./router/start-v8-run";
import { validateV8Run } from "./router/validate-v8-run";

export const router = {
  startV8Run,
  advanceV8Run,
  inspectV8Run,
  validateV8Run,
};
