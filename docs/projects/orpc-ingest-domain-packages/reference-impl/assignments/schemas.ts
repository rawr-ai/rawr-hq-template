import { z } from 'zod'

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  tagId: z.string().uuid(),
  createdAt: z.coerce.date(),
})

export type Assignment = z.infer<typeof AssignmentSchema>
