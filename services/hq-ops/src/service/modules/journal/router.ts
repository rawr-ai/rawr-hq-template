import { module } from "./module";

const writeEvent = module.writeEvent.handler(async ({ context, input }) => {
  return await context.repo.writeEvent(input);
});

const writeSnippet = module.writeSnippet.handler(async ({ context, input }) => {
  return await context.repo.writeSnippet(input);
});

const getSnippet = module.getSnippet.handler(async ({ context, input }) => {
  return await context.repo.getSnippet(input.id);
});

const tailSnippets = module.tailSnippets.handler(async ({ context, input }) => {
  return await context.repo.tailSnippets(input.limit);
});

const searchSnippets = module.searchSnippets.handler(async ({ context, input }) => {
  return await context.repo.searchSnippets(input.query, input.limit, input.mode);
});

export const router = module.router({
  writeEvent,
  writeSnippet,
  getSnippet,
  tailSnippets,
  searchSnippets,
});
