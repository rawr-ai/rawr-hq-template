import { impl } from "./impl";
import { router as repo } from "./modules/repo/router";
import { router as scratchPolicy } from "./modules/scratch-policy/router";
import { router as stack } from "./modules/stack/router";
import { router as worktree } from "./modules/worktree/router";

export const router = impl.router({
  stack,
  repo,
  worktree,
  scratchPolicy,
});

export type Router = typeof router;
