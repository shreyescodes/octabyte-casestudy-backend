"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'portfolio_dashboard',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
class Database {
    static async getClient() {
        return await pool.connect();
    }
    static async query(text, params) {
        const client = await pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        }
        finally {
            client.release();
        }
    }
    static async transaction(callback) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async testConnection() {
        try {
            const result = await pool.query('SELECT NOW()');
            console.log('Database connected successfully:', result.rows[0]);
            return true;
        }
        catch (error) {
            console.error('Database connection failed:', error);
            return false;
        }
    }
}
exports.Database = Database;
exports.default = Database;
