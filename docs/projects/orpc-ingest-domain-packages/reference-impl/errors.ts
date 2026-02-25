// ============================================================================
// Shared errors. Base failure modes any module in this service can produce.
// Module-specific errors live in their own module folder.
// ============================================================================

export class NotFoundError {
  readonly _tag = 'NotFoundError' as const
  readonly message: string
  constructor(readonly entity: string, readonly id: string) {
    this.message = `${entity} '${id}' not found`
  }
}

export class DatabaseError {
  readonly _tag = 'DatabaseError' as const
  readonly message = 'A database error occurred'
  constructor(readonly cause: unknown) {}
}
