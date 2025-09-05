import { PoolClient } from 'pg';
export declare class Database {
    static getClient(): Promise<PoolClient>;
    static query(text: string, params?: any[]): Promise<any>;
    static transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    static testConnection(): Promise<boolean>;
}
export default Database;
//# sourceMappingURL=database.d.ts.map