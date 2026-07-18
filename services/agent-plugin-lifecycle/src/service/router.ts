import { router as exports } from "./modules/exports/router";
import { router as governance } from "./modules/governance/router";
import { router as packaging } from "./modules/packaging/router";
import { router as providers } from "./modules/providers/router";
import { router as releases } from "./modules/releases/router";
import { router as vendors } from "./modules/vendors/router";
import { impl } from "./impl";

export const router = impl.router({
  releases,
  vendors,
  packaging,
  exports,
  providers,
  governance,
});

export type Router = typeof router;
