import { module } from "./module";

const retireStaleManaged = module.retireStaleManaged.handler(async ({ context, input }) => {
  return context.repo.retireStaleManaged(input);
});

export const router = module.router({
  retireStaleManaged,
});
