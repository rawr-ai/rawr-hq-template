import {
  consolidateCorpusWorkspace,
  initCorpusWorkspace,
} from "../../shared/engine";
import { rethrowAsOrpcError } from "../../shared/errors";
import { module } from "./module";

const initWorkspace = module.initWorkspace.handler(async ({ input }) => {
  return initCorpusWorkspace(input.workspaceRoot);
});

const consolidateWorkspace = module.consolidateWorkspace.handler(async ({ input }) => {
  try {
    return await consolidateCorpusWorkspace(input.workspaceRoot);
  } catch (error) {
    rethrowAsOrpcError(error);
  }
});

export const router = module.router({
  initWorkspace,
  consolidateWorkspace,
});
