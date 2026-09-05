import { impl } from "./impl";
import { router as repo } from "./modules/repo/router";
import { router as stack } from "./modules/stack/router";
import { router as worktree } from "./modules/worktree/router";

/** Closes the native implementation over completed module routers. */
export const router = impl.router({ repo, stack, worktree });
