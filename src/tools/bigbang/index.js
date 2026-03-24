// src/tools/bigbang/index.js
// Entry point for the bigbang tool
import registerConfig from '../../common/config.js';
import registerDelete from './delete.js';

export default function (program, toolName) {
    // Register shared config commands
    registerConfig(program, toolName);

    // Register bigbang-specific delete commands
    registerDelete(program, toolName);

    // Add top-level examples for the tool
    program.addHelpText('after', `
Examples:
  Configure a path:
    $ zero-ops ${toolName} config set projectA ./data/projectA --active

  List configurations:
    $ zero-ops ${toolName} config list

  Delete data in a configured path:
    $ zero-ops ${toolName} delete projectA

  Delete data in all active paths:
    $ zero-ops ${toolName} delete-active
`);
}

/**
 * Telegram UI Hook: Provides dynamic interactive buttons for parameterless commands.
 */
export async function getTelegramInterceptor(cmdText, executeCommand) {
    if (cmdText === 'bigbang config activate' || cmdText === 'bigbang config deactivate' || cmdText === 'bigbang config delete') {
        const action = cmdText.split(' ')[2];
        const configOutput = await executeCommand('bigbang config list');
        const configMatches = [...configOutput.matchAll(/^([a-zA-Z0-9_-]+):\s+.*?\((Active|Inactive)\)/gm)];
        const configs = configMatches.slice(0, 15);
        
        if (configs.length === 0) {
            return { message: `No configurations found to ${action}.`, buttons: [] };
        }

        const buttons = [];
        configs.forEach(match => {
            const name = match[1];
            const state = match[2];
            
            if (action === 'activate' && state === 'Active') return;
            if (action === 'deactivate' && state === 'Inactive') return;
            
            let icon = action === 'delete' ? '🗑️' : (action === 'activate' ? '🟢' : '🛑');
            buttons.push([{ text: `${icon} ${name}`, callback: `cmd_bigbang config ${action} ${name}` }]);
        });
        
        if (buttons.length === 0) {
            return { message: `No eligible configurations found for ${action}.`, buttons: [] };
        }

        return { message: `Select a configuration to ${action}:`, buttons };
    }

    if (cmdText === 'bigbang delete') {
        const configOutput = await executeCommand('bigbang config list');
        const configMatches = [...configOutput.matchAll(/^([a-zA-Z0-9_-]+):/gm)];
        const configs = configMatches.slice(0, 15);
        
        if (configs.length === 0) {
            return { message: `No deployed projects found to delete.`, buttons: [] };
        }

        const buttons = [];
        configs.forEach(match => {
            buttons.push([{ text: `🔥 Destroy ${match[1]}`, callback: `cmd_bigbang delete ${match[1]}` }]);
        });

        return { message: `Select a project to destroy:`, buttons };
    }
    
    if (cmdText === 'bigbang config set') {
        return { 
            message: `⚠️ 'bigbang config set' requires custom parameters (AppName and Path) that cannot be intuitively selected via buttons.\n\nPlease type the following command directly into the chat or terminal:\n\n\`zero-ops bigbang config set <name> <absolute_path>\``, 
            buttons: [] 
        };
    }

    return null;
}

/**
 * Telegram UI Hook: Appends dynamic context buttons to string outputs.
 */
export async function getTelegramPostProcessor(cmdText, outputText) {
    if (cmdText.trim().endsWith('config list')) {
        const targetTool = cmdText.split(' ')[0]; // usually 'bigbang'
        const dynamicButtons = [];
        const configMatches = [...outputText.matchAll(/^([a-zA-Z0-9_-]+):\s+.*?\((Active|Inactive)\)/gm)];
        const configs = configMatches.slice(0, 5);
        
        configs.forEach(match => {
            const name = match[1];
            const state = match[2];
            
            if (state === 'Active') {
                dynamicButtons.push([
                    { text: `🛑 Disable ${name}`, callback: `cmd_${targetTool} config deactivate ${name}` },
                    { text: `🗑️ Delete ${name}`, callback: `cmd_${targetTool} config delete ${name}` }
                ]);
            } else {
                dynamicButtons.push([
                    { text: `🟢 Enable ${name}`, callback: `cmd_${targetTool} config activate ${name}` },
                    { text: `🗑️ Delete ${name}`, callback: `cmd_${targetTool} config delete ${name}` }
                ]);
            }
        });
        
        return { buttons: dynamicButtons };
    }
    return null;
}
