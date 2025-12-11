// src/commands/config.js
// ES module for configuration commands
import { loadConfig, saveConfig } from '../utils/index.js';
import path from 'path';

export default function (program, toolName) {
    const config = program.command('config')
        .description('Manage named paths')
        .addHelpText('after', `
Examples:
  Set a path:
    $ zero-ops ${toolName || '<tool>'} config set projectA ./data/projectA --active

  List paths:
    $ zero-ops ${toolName || '<tool>'} config list

  Delete a config:
    $ zero-ops ${toolName || '<tool>'} config delete projectA
        `);

    config
        .command('set <name> <dir>')
        .option('-a, --active', 'Mark this path as active')
        .description('Add or update a named path configuration')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config set projectA ./data/projectA --active
        `)
        .action((name, dir, options) => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config set ...');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (!cfg[toolName]) cfg[toolName] = {};
            cfg[toolName][name] = { path: path.resolve(dir), active: !!options.active };
            saveConfig(cfg);
            console.log(`Config '${name}' for tool '${toolName}' set to ${dir}${options.active ? ' (active)' : ''}`);
        });

    config
        .command('delete <name>')
        .description('Remove a named configuration entry')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config delete projectA
        `)
        .action((name) => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config delete ...');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (cfg[toolName] && cfg[toolName][name]) {
                delete cfg[toolName][name];
                if (Object.keys(cfg[toolName]).length === 0) {
                    delete cfg[toolName];
                }
                saveConfig(cfg);
                console.log(`Config '${name}' for tool '${toolName}' removed.`);
            } else {
                console.warn(`Config '${name}' for tool '${toolName}' not found.`);
            }
        });

    config
        .command('activate <name>')
        .description('Mark a named path as active')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config activate projectA
        `)
        .action((name) => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config activate ...');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (cfg[toolName] && cfg[toolName][name]) {
                cfg[toolName][name].active = true;
                saveConfig(cfg);
                console.log(`Config '${name}' for tool '${toolName}' activated.`);
            } else {
                console.warn(`Config '${name}' for tool '${toolName}' not found.`);
            }
        });

    config
        .command('deactivate <name>')
        .description('Mark a named path as inactive')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config deactivate projectA
        `)
        .action((name) => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config deactivate ...');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (cfg[toolName] && cfg[toolName][name]) {
                cfg[toolName][name].active = false;
                saveConfig(cfg);
                console.log(`Config '${name}' for tool '${toolName}' deactivated.`);
            } else {
                console.warn(`Config '${name}' for tool '${toolName}' not found.`);
            }
        });

    config
        .command('activate-all')
        .description('Mark all paths as active for this tool')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config activate-all
        `)
        .action(() => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config activate-all');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (cfg[toolName]) {
                let count = 0;
                for (const name in cfg[toolName]) {
                    cfg[toolName][name].active = true;
                    count++;
                }
                saveConfig(cfg);
                console.log(`Activated ${count} paths for tool '${toolName}'.`);
            } else {
                console.warn(`No configurations found for tool '${toolName}'.`);
            }
        });

    config
        .command('deactivate-all')
        .description('Mark all paths as inactive for this tool')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config deactivate-all
        `)
        .action(() => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config deactivate-all');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (cfg[toolName]) {
                let count = 0;
                for (const name in cfg[toolName]) {
                    cfg[toolName][name].active = false;
                    count++;
                }
                saveConfig(cfg);
                console.log(`Deactivated ${count} paths for tool '${toolName}'.`);
            } else {
                console.warn(`No configurations found for tool '${toolName}'.`);
            }
        });

    config
        .command('list')
        .description('List all stored configurations for this tool')
        .addHelpText('after', `
Example:
  $ zero-ops ${toolName || '<tool>'} config list
        `)
        .action(() => {
            if (!toolName) {
                console.error('Error: Tool name is required. Usage: zero-ops <tool> config list');
                process.exit(1);
            }
            const cfg = loadConfig();
            if (!cfg[toolName] || Object.keys(cfg[toolName]).length === 0) {
                console.log(`No configurations found for tool '${toolName}'.`);
                return;
            }
            console.table(
                Object.entries(cfg[toolName]).map(([name, info]) => ({ tool: toolName, name, path: info.path, active: info.active }))
            );
        });
}
