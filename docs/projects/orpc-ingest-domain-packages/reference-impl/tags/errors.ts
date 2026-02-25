export class DuplicateTagError {
  readonly _tag = 'DuplicateTagError' as const
  readonly message: string
  constructor(readonly name: string) {
    this.message = `Tag '${name}' already exists`
  }
}
