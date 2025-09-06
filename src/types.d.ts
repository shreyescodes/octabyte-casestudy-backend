// Comprehensive type declarations for all modules

declare var process: any;
declare var __dirname: any;
declare var __filename: any;
declare var console: any;
declare var Buffer: any;
declare var global: any;
declare var require: any;
declare var module: any;
declare var exports: any;
declare var setTimeout: any;
declare var setInterval: any;
declare var clearTimeout: any;
declare var clearInterval: any;

declare namespace NodeJS {
  interface Timer {}
  interface Global {}
  interface Process {
    env: any;
    exit: any;
    on: any;
  }
}

declare module 'express' {
  const express: any;
  export = express;
  export interface Request {
    params: any;
    query: any;
    body: any;
    headers: any;
    originalUrl: string;
  }
  export interface Response {
    json: any;
    status: any;
    send: any;
    end: any;
  }
  export interface NextFunction {
    (err?: any): void;
  }
  export interface Router {
    get: any;
    post: any;
    put: any;
    delete: any;
    use: any;
  }
}

declare module 'cors' {
  const cors: any;
  export = cors;
}

declare module 'helmet' {
  const helmet: any;
  export = helmet;
}

declare module 'morgan' {
  const morgan: any;
  export = morgan;
}

declare module 'express-rate-limit' {
  const rateLimit: any;
  export = rateLimit;
}

declare module 'dotenv' {
  export const config: any;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query: any;
    connect: any;
    end: any;
  }
  export class Client {
    constructor(config?: any);
    query: any;
    connect: any;
    end: any;
  }
  export interface PoolClient {
    query: any;
    release: any;
  }
}

declare module 'uuid' {
  export const v4: any;
}

declare module 'winston' {
  export const createLogger: any;
  export const format: any;
  export const transports: any;
  export interface transport {}
}

declare module 'axios' {
  const axios: any;
  export = axios;
}

declare module 'cheerio' {
  export const load: any;
}

declare module 'yahoo-finance2' {
  export const quoteSummary: any;
  export const search: any;
  export const chart: any;
  export const quote: any;
  export const historical: any;
}

declare module 'fs' {
  export const readFileSync: any;
  export const writeFileSync: any;
  export const existsSync: any;
  export const mkdirSync: any;
  export const readdirSync: any;
}

declare module 'path' {
  export const join: any;
  export const resolve: any;
  export const dirname: any;
  export const basename: any;
  export const extname: any;
}
