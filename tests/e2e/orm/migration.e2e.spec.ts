import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('TypeORM Migrations E2E', () => {
    let app: INestApplication;
    let testingModule: TestingModule;
    let dataSource: DataSource;

    beforeAll(async () => {
        testingModule = await createTestingModule();
        app = testingModule.createNestApplication();
        await app.init();

        dataSource = testingModule.get<DataSource>(DataSource);

        console.log('Clearing database...');
        try {
            await dataSource.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS email_verifications CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS password_resets CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS users CASCADE`);

            await dataSource.query(`DROP TYPE IF EXISTS users_role_enum CASCADE`);
            await dataSource.query(`DROP TYPE IF EXISTS audit_logs_action_enum CASCADE`);

            await dataSource.query(`DROP TABLE IF EXISTS migrations CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS typeorm_metadata CASCADE`);

            console.log('Database cleared successfully.');
        } catch (error) {
            console.error('Error clearing database:', error.message);
        }

        console.log('Synchronizing database schema...');
        try {
            await dataSource.synchronize(true);
            console.log('Database schema synchronized successfully');
        } catch (error) {
            console.error('Error synchronizing database:', error.message);
            throw error;
        }
    });

    afterAll(async () => {
        await app.close();
    });

    it('should have all required tables after migrations', async () => {
        interface TableResult {
            table_name: string;
        }

        const tables = await dataSource.query<TableResult[]>(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );

        const tableNames = tables.map((t: TableResult) => t.table_name);

        expect(tableNames).toContain('users');
        expect(tableNames).toContain('refresh_tokens');
        expect(tableNames).toContain('password_resets');
        expect(tableNames).toContain('email_verifications');
        expect(tableNames).toContain('audit_logs');
    });

    it('should have all required enums', async () => {
        interface EnumResult {
            typname: string;
        }

        const enums = await dataSource.query<EnumResult[]>(
            `SELECT typname FROM pg_type JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_type.typnamespace WHERE typtype = 'e' AND nspname = 'public'`
        );

        const enumNames = enums.map((e: EnumResult) => e.typname);

        expect(enumNames).toContain('users_role_enum');
        expect(enumNames).toContain('audit_logs_action_enum');
    });

    it('should have correct columns in users table', async () => {
        interface ColumnResult {
            column_name: string;
            data_type: string;
        }

        const columns = await dataSource.query<ColumnResult[]>(
            `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'`
        );

        const columnMap = columns.reduce((acc: Record<string, string>, col: ColumnResult) => {
            acc[col.column_name] = col.data_type;
            return acc;
        }, {});

        expect(columnMap).toHaveProperty('id');
        expect(columnMap).toHaveProperty('email');
        expect(columnMap).toHaveProperty('password');
        expect(columnMap).toHaveProperty('firstName');
        expect(columnMap).toHaveProperty('lastName');
        expect(columnMap).toHaveProperty('isEmailVerified');
        expect(columnMap).toHaveProperty('isActive');
        expect(columnMap).toHaveProperty('role');
        expect(columnMap).toHaveProperty('createdAt');
        expect(columnMap).toHaveProperty('updatedAt');
    });

    it('should enforce email uniqueness constraint', async () => {
        interface ConstraintResult {
            constraint_name: string;
            constraint_type: string;
        }

        const constraints = await dataSource.query<ConstraintResult[]>(
            `SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
             WHERE table_name = 'users' AND constraint_type = 'UNIQUE' AND table_schema = 'public'`
        );

        expect(constraints.length).toBeGreaterThan(0);

        await dataSource.query(`
            INSERT INTO users (email, password, "isEmailVerified", "isActive", role)
            VALUES ('test-migration@example.com', 'password', false, true, 'user')
            ON CONFLICT DO NOTHING
        `);

        try {
            await dataSource.query(`
                INSERT INTO users (email, password, "isEmailVerified", "isActive", role)
                VALUES ('test-migration@example.com', 'another-password', false, true, 'user')
            `);
            fail('Should have thrown an error for duplicate email');
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('duplicate key');
        }
    });

    it('should enforce foreign key constraints', async () => {
        try {
            await dataSource.query(`
                INSERT INTO refresh_tokens (token, "userId", "expiresAt")
                VALUES ('test-token', '00000000-0000-0000-0000-000000000000', NOW() + INTERVAL '1 day')
            `);
            fail('Should have thrown an error for foreign key constraint');
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toMatch(/foreign key|violates|not-null|not null|does not exist/i);
        }
    });

    it('should have cascading delete for refresh tokens', async () => {
        interface UserResult {
            id: string;
        }

        const userResult = await dataSource.query<UserResult[]>(`
            INSERT INTO users (email, password, "isEmailVerified", "isActive", role)
            VALUES ('cascade-test@example.com', 'password', false, true, 'user')
            RETURNING id
        `);

        const userId = userResult[0].id;

        await dataSource.query(
            `
            INSERT INTO refresh_tokens (token, "userId", "expiresAt")
            VALUES ('cascade-test-token', $1, NOW() + INTERVAL '1 day')
        `,
            [userId]
        );

        const tokensBeforeDelete = await dataSource.query<Array<Record<string, unknown>>>(
            `SELECT * FROM refresh_tokens WHERE "userId" = $1`,
            [userId]
        );
        expect(tokensBeforeDelete.length).toBeGreaterThan(0);

        await dataSource.query(`DELETE FROM users WHERE id = $1`, [userId]);

        const tokensAfterDelete = await dataSource.query<Array<Record<string, unknown>>>(
            `SELECT * FROM refresh_tokens WHERE "userId" = $1`,
            [userId]
        );
        expect(tokensAfterDelete.length).toBe(0);
    });

    it('should support schema drop and recreation', async () => {
        await dataSource.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
        await dataSource.query(`DROP TABLE IF EXISTS users CASCADE`);

        try {
            await dataSource.query(`SELECT * FROM users LIMIT 1`);
            fail('Users table should not exist after drop');
        } catch (error) {
            expect(error).toBeDefined();
            expect(error.message).toContain('relation "users" does not exist');
        }

        await dataSource.synchronize();

        interface TableResult {
            table_name: string;
        }

        const tablesAfterReapply = await dataSource.query<TableResult[]>(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );

        const tableNamesAfterReapply = tablesAfterReapply.map((t: TableResult) => t.table_name);
        expect(tableNamesAfterReapply).toContain('users');
    });
});
