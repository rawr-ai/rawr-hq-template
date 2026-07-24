import { service } from "./impl";
import { router as governance } from "./modules/governance/router";
import { router as packaging } from "./modules/packaging/router";
import { router as providers } from "./modules/providers/router";
import { router as releases } from "./modules/releases/router";
import { router as vendors } from "./modules/vendors/router";

export const router = service.router({
  releases,
  vendors,
  packaging,
  providers,
  governance,
});

export type Router = typeof router;
