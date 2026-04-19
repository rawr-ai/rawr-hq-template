declare module "bun:sqlite" {
  export class Statement {
    get(...params: any[]): any;
    run(...params: any[]): any;
    all(...params: any[]): any[];
  }

  export class Database {
    constructor(path: string);
    exec(sql: string): this;
    prepare(sql: string): Statement;
    query(sql: string): { get: (params?: any[]) => any; run: (params?: any[]) => any };
    close(): void;
  }
}
