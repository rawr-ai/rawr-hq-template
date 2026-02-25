import { z } from 'zod'

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  createdAt: z.coerce.date(),
})

export type Tag = z.infer<typeof TagSchema>
