declare module "bun:sqlite" {
  export class Database {
    constructor(path: string);
    query(sql: string): { get: (params?: any[]) => any; run: (params?: any[]) => any };
    close(): void;
  }
}

