import { router as corpus } from "./modules/corpus/router";
import { impl } from "./impl";

export const router = impl.router({
  corpus,
});

export type Router = typeof router;
