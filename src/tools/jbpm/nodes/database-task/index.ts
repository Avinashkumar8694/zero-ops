import { registerNode, NodePackage } from '../registry.js';
import pkg from './package.json' assert { type: 'json' };

const databaseTask: NodePackage = {
    id: pkg.name,
    bpmnType: pkg.bpmnType,
    label: pkg.label,
    version: pkg.version,
    category: pkg.category as any,
    icon: '/nodes/database-task/assets/icon.svg',
    fields: [
        { key: 'name', label: 'Query Label', type: 'text' },
        { key: 'connectionString', label: 'Connection (Env Key)', type: 'text', placeholder: 'DB_URL_PROD' },
        { key: 'query', label: 'SQL/Query Snippet', type: 'snippet', description: 'Supports parameterized queries.' },
        { key: 'params', label: 'Parameters Mapping', type: 'keyvalue', description: 'Map variables to query placeholders.' },
        { key: 'resultVariable', label: 'Output Variable', type: 'text', default: 'queryResult' }
    ],
    documentation: {
        desc: 'Orchestrates direct database operations (SQL/NoSQL) via tactical connection strings.',
        flow: 'SQL Syntax -> Connection Pool -> Execution -> Result Hydration.',
        example: 'SELECT * FROM users WHERE id = :userId'
    },
    action: async (ctx) => {
        ctx.logger(`Executing database query on ${ctx.config.connectionString}`);
        return { success: true, output: { [ctx.config.resultVariable || 'queryResult']: [] } };
    }
};

registerNode(databaseTask);
export default databaseTask;
