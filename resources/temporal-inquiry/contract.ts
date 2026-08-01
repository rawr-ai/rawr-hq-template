/** A bounded inquiry session with separate read and write capabilities. */
export interface TemporalInquirySession<ReadClient, WriteClient> {
  readonly read: <Result>(use: (client: ReadClient) => Promise<Result>) => Promise<Result>;
  readonly write: <Result>(use: (client: WriteClient) => Promise<Result>) => Promise<Result>;
}

/** Provider-neutral owner of one foreground semantic-inquiry lifetime. */
export interface TemporalInquiryResource<Options, ReadClient, WriteClient> {
  readonly withSession: <Result>(
    options: Options,
    use: (session: TemporalInquirySession<ReadClient, WriteClient>) => Promise<Result>
  ) => Promise<Result>;
}
