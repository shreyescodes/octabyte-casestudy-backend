"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../config/database"));
async function runMigration() {
    try {
        console.log('Starting database migration...');
        const isConnected = await database_1.default.testConnection();
        if (!isConnected) {
            throw new Error('Failed to connect to database');
        }
        const schemaPath = path_1.default.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        await database_1.default.query(schema);
        console.log('Database migration completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
runMigration();
