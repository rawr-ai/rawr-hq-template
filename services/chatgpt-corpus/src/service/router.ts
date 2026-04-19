import { router as corpusArtifacts } from "./modules/corpus-artifacts/router";
import { router as sourceMaterials } from "./modules/source-materials/router";
import { router as workspace } from "./modules/workspace/router";
import { impl } from "./impl";

export const router = impl.router({
  workspace,
  sourceMaterials,
  corpusArtifacts,
});

export type Router = typeof router;
