/**
 * Database configuration interface
 */
export interface DatabaseConfig {
    type: DatabaseType;
    host: string;
    port: number;
    basename: string;
    username: string;
    password: string;
    database: string;
}
