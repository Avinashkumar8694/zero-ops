// src/commands/delete.js
// ES module for deletion commands
import { loadConfig, deleteDirectoryContents } from '../../utils/index.js';

export default function (program, toolName) {
    // Delete data inside a specific named path
    program
        .command('delete <name>')
        .description('Delete all data inside the directory associated with <name>')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} delete projectA
        `)
        .action((name) => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> delete ...');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (!cfg[toolName] || !cfg[toolName][name]) {
                console.warn(`Config '${name}' for tool '${toolName}' not found.`);
                return;
            }
            deleteDirectoryContents(cfg[toolName][name].path);
        });

    // Delete data inside all active paths
    program
        .command('delete-active')
        .description('Delete data inside all active paths')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} delete-active
        `)
        .action(() => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> delete-active');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (!cfg[toolName]) {
                console.warn(`No configurations found for tool '${toolName}'.`);
                return;
            }
            const activeEntries = Object.values(cfg[toolName]).filter((c) => c.active);
            if (activeEntries.length === 0) {
                console.log(`No active paths to delete for tool '${toolName}'.`);
                return;
            }
            activeEntries.forEach((entry) => deleteDirectoryContents(entry.path));
        });
}
