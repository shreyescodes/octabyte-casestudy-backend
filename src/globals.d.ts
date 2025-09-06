// Global type declarations for Node.js
declare var process: any;
declare var __dirname: string;
declare var __filename: string;
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
  interface Global {
    [key: string]: any;
  }
}

declare module 'fs' {
  export function readFileSync(path: string, encoding?: string): any;
  export function writeFileSync(path: string, data: any): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: any): void;
  export function readdirSync(path: string): string[];
  // Add other fs methods as needed
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string): string;
  export function extname(path: string): string;
  // Add other path methods as needed
}

declare module 'express' {
  export = express;
  function express(): any;
  namespace express {
    export interface Request {}
    export interface Response {}
    export interface NextFunction {}
    export interface Application {}
    export interface Router {}
  }
}

declare module 'cors' {
  function cors(options?: any): any;
  export = cors;
}

declare module 'morgan' {
  function morgan(format: string, options?: any): any;
  export = morgan;
}

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<any>;
    connect(): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: any);
    query(text: string, params?: any[]): Promise<any>;
    connect(): Promise<void>;
    end(): Promise<void>;
  }
}

declare module 'uuid' {
  export function v4(): string;
}

declare module 'winston' {
  export function createLogger(options?: any): any;
  export const format: any;
  export const transports: any;
}

declare module 'helmet' {
  function helmet(options?: any): any;
  export = helmet;
}

declare module 'express-rate-limit' {
  function rateLimit(options?: any): any;
  export = rateLimit;
}

declare module 'dotenv' {
  export function config(options?: any): any;
}

declare module 'cheerio' {
  export function load(html: string): any;
}

declare module 'axios' {
  export default axios;
  function axios(config: any): Promise<any>;
  namespace axios {
    export function get(url: string, config?: any): Promise<any>;
    export function post(url: string, data?: any, config?: any): Promise<any>;
  }
}

declare module 'yahoo-finance2' {
  export function quoteSummary(symbol: string, options?: any): Promise<any>;
  export function search(query: string, options?: any): Promise<any>;
  export function chart(symbol: string, options?: any): Promise<any>;
}
