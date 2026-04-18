import pg from 'pg';

const config = {
    user: 'admin',
    host: 'localhost',
    database: 'zero',
    password: '123456',
    port: 5433,
};

async function migrate() {
    const pool = new pg.Pool(config);
    try {
        console.log('--- Zero-BPM: Forced Schema Migration ---');
        
        // 1. Hardening User-Group Roles
        console.log('[MIGRATE] Upgrading zero_user_groups with role context...');
        await pool.query(`ALTER TABLE zero_user_groups ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER'`);
        
        // 2. Provisioning Access Matrix
        console.log('[MIGRATE] Provisioning Dynamic Governance tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS zero_access_controls (
                permission_key VARCHAR(100) PRIMARY KEY,
                category VARCHAR(50),
                description TEXT
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS zero_role_permissions (
                id SERIAL PRIMARY KEY,
                group_name VARCHAR(100) REFERENCES zero_groups(group_name),
                role_name VARCHAR(50),
                permission_key VARCHAR(100) REFERENCES zero_access_controls(permission_key),
                is_enabled BOOLEAN DEFAULT TRUE,
                UNIQUE(group_name, role_name, permission_key)
            )
        `);

        // 3. Seeding Permission Keys
        console.log('[MIGRATE] Seeding System Access Controls...');
        const perms = [
            ['PROCESS_VIEW', 'PROCESS', 'View active and completed processes'],
            ['PROCESS_ABORT', 'PROCESS', 'Force-terminate running process instances'],
            ['TASK_REASSIGN', 'TASK', 'Force-reassign tasks to different users'],
            ['IAM_ADMIN', 'SYSTEM', 'Manage users, groups, and permissions'],
            ['MODELER_EDIT', 'PROCESS', 'Modify and deploy BPMN definitions'],
            ['PROJECT_MANAGE', 'SYSTEM', 'Create, Export, and Delete Projects']
        ];
        for (const [k, c, d] of perms) {
            await pool.query(`INSERT INTO zero_access_controls (permission_key, category, description) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [k, c, d]);
        }

        console.log('[SUCCESS] Database orchestrated to RBAC v2 standards.');
    } catch (err) {
        console.error('[ERROR] Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
