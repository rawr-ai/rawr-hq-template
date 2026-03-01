export class AlreadyAssignedError {
  readonly _tag = 'AlreadyAssignedError' as const
  readonly message: string
  constructor(readonly taskId: string, readonly tagId: string) {
    this.message = `Task '${taskId}' already has tag '${tagId}'`
  }
}
