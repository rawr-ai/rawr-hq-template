declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string);
    query(sql: string): {
      get(params?: unknown[]): unknown;
      run(params?: unknown[]): unknown;
      all(params?: unknown[]): unknown[];
    };
    close(): void;
  }
}
