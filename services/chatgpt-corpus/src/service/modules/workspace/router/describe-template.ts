/**
 * chatgpt-corpus: workspace module.
 *
 * This router owns workspace scaffolding for corpus operations. The service
 * defines the managed file set and template structure so tools can initialize
 * a workspace without encoding the template in projections.
 */
import { createWorkspaceTemplate } from "../model/policy";
import { module } from "../module";

export const describeTemplate = module.describeTemplate.handler(async () => {
  return createWorkspaceTemplate();
});
