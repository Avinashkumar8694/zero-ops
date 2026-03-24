import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { loadConfig } from '../../utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..'); // snippent root (package.json location)
const zeroOpsScript = path.join(projectRoot, 'zero-ops.js');

const toolName = process.env.ZERO_OPS_TOOL_NAME || 'telegram';

// Log helper
function log(msg) {
    const logFile = path.join(os.homedir(), '.zero-ops', 'telegram.log');
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
}

// Load config
let config = loadConfig();

const telegramConfig = config[toolName];
if (!telegramConfig || !telegramConfig.token || !telegramConfig.chat_id) {
    log('Missing configuration (token or chat_id). Exiting.');
    process.exit(1);
}

const bot = new Telegraf(telegramConfig.token);
const allowedChatId = String(telegramConfig.chat_id);

// Middleware to check chat_id
bot.use(async (ctx, next) => {
    if (String(ctx.chat.id) !== allowedChatId) {
        log(`Unauthorized access attempt from chat_id: ${ctx.chat.id}`);
        return; // Ignore unauthorized
    }
    await next();
});

// Helper: Discover tools
function getAvailableTools() {
    const toolsDir = path.join(projectRoot, 'src', 'tools');
    if (fs.existsSync(toolsDir)) {
        return fs.readdirSync(toolsDir).filter(t => fs.statSync(path.join(toolsDir, t)).isDirectory());
    }
    return [];
}

// Helper: Execute command
// Helper: Execute command
function executeCommand(cmdStr) {
    return new Promise((resolve) => {
        // cmdStr e.g. "desktop list" or "desktop minimize 'app name'"
        // We need to parse cmdStr into arguments array safely.
        // Simple split by space is not enough for quoted arguments.
        // We will match regex for spaces outside quotes.

        const argsMatch = cmdStr.match(/(?:[^\s"]+|"[^"]*")+/g);
        const args = argsMatch ? argsMatch.map(a => a.replace(/^"|"$/g, '')) : [];

        log(`Executing: node zero-ops.js ${args.join(' ')}`);

        const subprocess = spawn(process.execPath, [zeroOpsScript, ...args]);

        let stdout = '';
        let stderr = '';

        subprocess.stdout.on('data', (data) => { stdout += data; });
        subprocess.stderr.on('data', (data) => { stderr += data; });

        subprocess.on('close', (code) => {
            if (code !== 0) {
                log(`Error execution code ${code}: ${stderr}`);
                resolve(`Error (Exit Code ${code}):\n${stderr || stdout}`);
            } else {
                resolve(stdout || stderr || 'Command executed empty output.');
            }
        });

        subprocess.on('error', (err) => {
            log(`Error parsing: ${err.message}`);
            resolve(`Execution Error: ${err.message}`);
        });
    });
}

// Handle "commands" or "help" for global list
bot.hears(['commands', 'help', 'list'], async (ctx) => {
    const tools = getAvailableTools();
    ctx.reply('Fetching commands and examples for all tools...');

    for (const t of tools) {
        // Run help for each tool: zero-ops <tool> --help
        const output = await executeCommand(`${t} --help`);

        // Extract Examples section
        const examplesMatch = output.split('Examples:');
        let examples = '';
        if (examplesMatch.length > 1) {
            examples = examplesMatch[1].trim();
        } else {
            // Fallback: try to just list commands from "Commands:" section
            const cmdsMatch = output.split('Commands:');
            if (cmdsMatch.length > 1) {
                examples = cmdsMatch[1].split('Examples:')[0].trim();
            } else {
                examples = '(No detailed examples found)';
            }
        }

        // Clean up examples for Telegram (remove "$ zero-ops " prefixes)
        examples = examples
            .replace(/\$ zero-ops /g, '') // Remove "$ zero-ops "
            .replace(/zero-ops /g, '')    // Remove "zero-ops " if $ missing
            .replace(/^\s*\$\s*/gm, ''); // Remove leading $ on lines

        const message = `🛠 **Tool: ${t}**\n\n${examples}`;
        await ctx.reply(message);
    }
});

// Quick Action Menu
function getMainMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('📸 Take Photo', 'cmd_camera capture')],
        [Markup.button.callback('🖥️ Screenshot', 'cmd_desktop screenshot'), Markup.button.callback('📉 Minimize All', 'cmd_desktop minimize-all')],
        [Markup.button.callback('🛡️ Security Snapshot', 'cmd_monitor snapshot'), Markup.button.callback('🌐 Active Network', 'cmd_monitor network')],
        [Markup.button.callback('🚨 Check Reverse Shells', 'cmd_monitor reverse-shell')],
        [Markup.button.callback('❓ Explore All Tools & Commands', 'cmd_tools')]
    ]);
}

// Start command
bot.start((ctx) => {
    ctx.reply('Welcome to zero-ops remote! Select a quick action below or type a command:', getMainMenu());
});

// Handle button clicks
bot.action(/cmd_(.+)/, async (ctx) => {
    const cmd = ctx.match[1].trim();
    
    // Acknowledge the button click to remove the loading state on the button
    await ctx.answerCbQuery();
    
    if (cmd === 'menu') {
        await ctx.reply('Select a quick action:', getMainMenu());
        return;
    }
    
    // Level 1: List all tools
    if (cmd === 'tools') {
        const tools = getAvailableTools();
        const buttons = tools.map(t => [Markup.button.callback(`🛠️ ${t}`, `cmd_tool_${t}`)]);
        buttons.push([Markup.button.callback('🔙 Main Menu', 'cmd_menu')]);
        
        await ctx.reply('Select a tool to view its interactive commands:', Markup.inlineKeyboard(buttons));
        return;
    }

    // Level 2: List commands for a specific tool
    if (cmd.startsWith('tool_')) {
        const toolName = cmd.replace('tool_', '');
        
        await ctx.reply(`Fetching commands for ${toolName}...`);
        const helpOutput = await executeCommand(`${toolName} --help`);
        
        const lines = helpOutput.split('\n');
        const commands = [];
        let inCommandsSection = false;

        for (const line of lines) {
            if (line.trim().startsWith('Commands:')) {
                inCommandsSection = true;
                continue;
            }
            if (inCommandsSection && line.trim() === '') break;
            if (inCommandsSection && line.trim().startsWith('Examples:')) break;

            if (inCommandsSection) {
                const match = line.match(/^ {2,4}([a-zA-Z0-9_-]+)(?:\s+|$)/);
                if (match && match[1] !== 'help') {
                    commands.push(match[1]);
                }
            }
        }

        if (commands.length > 0) {
            const buttons = [];
            for (let i = 0; i < commands.length; i += 2) {
                const row = [];
                const c1 = commands[i];
                row.push(Markup.button.callback(`▶️ ${c1}`, `cmd_${toolName} ${c1}`));
                if (i + 1 < commands.length) {
                    const c2 = commands[i+1];
                    row.push(Markup.button.callback(`▶️ ${c2}`, `cmd_${toolName} ${c2}`));
                }
                buttons.push(row);
            }
            buttons.push([Markup.button.callback(`🔙 Back to Tools`, `cmd_tools`), Markup.button.callback(`🏠 Main Menu`, `cmd_menu`)]);

            await ctx.reply(`**${toolName}** Commands:`, Markup.inlineKeyboard(buttons));
        } else {
            await ctx.reply(`No sub-commands found for ${toolName}.`, getMainMenu());
        }
        return;
    }

    // Level 3: Execute the specific command
    await executeAndReply(ctx, cmd);
});

async function executeAndReply(ctx, text) {
    const tools = getAvailableTools();

    // 1. Check if text is just a tool name
    if (tools.includes(text)) {
        // Discovery: try to get help for tool
        const helpOutput = await executeCommand(`${text} --help`);

        const lines = helpOutput.split('\n');
        const commands = [];
        let inCommandsSection = false;

        for (const line of lines) {
            if (line.trim().startsWith('Commands:')) {
                inCommandsSection = true;
                continue;
            }
            if (inCommandsSection && line.trim() === '') break;
            if (inCommandsSection && line.trim().startsWith('Examples:')) break;

            if (inCommandsSection) {
                const match = line.match(/^ {2,4}([a-zA-Z0-9_-]+)(?:\s+|$)/);
                if (match && match[1] !== 'help') {
                    commands.push(match[1]);
                }
            }
        }

        if (commands.length > 0) {
            ctx.reply(`Tool: ${text}\nAvailable commands:`, {
                reply_markup: {
                    keyboard: commands.map(c => [`${text} ${c}`]),
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            });
        } else {
            ctx.reply(helpOutput);
        }
        return;
    }

    const toolName = text.split(' ')[0];
    const toolPath = path.join(projectRoot, 'src', 'tools', toolName, 'index.js');
    let toolModule = null;

    try {
        if (fs.existsSync(toolPath)) {
            // Convert to file:// URL for dynamic ESM import on Windows compatibility
            const fileUrl = 'file://' + toolPath;
            toolModule = await import(fileUrl);
        }
    } catch (err) {
        console.error(`Failed to load tool hook for ${toolName}: ${err.message}`);
    }

    // 2. Interactive Interceptors for commands requiring missing parameters
    if (toolModule && toolModule.getTelegramInterceptor) {
        const interceptionOptions = await toolModule.getTelegramInterceptor(text, executeCommand);
        if (interceptionOptions && interceptionOptions.buttons) {
            const buttons = interceptionOptions.buttons.map(row => 
                row.map(btn => Markup.button.callback(btn.text, btn.callback))
            );
            
            buttons.push([Markup.button.callback('🔙 Back to Tools', 'cmd_tools'), Markup.button.callback('🏠 Main Menu', 'cmd_menu')]);
            await ctx.reply(interceptionOptions.message, Markup.inlineKeyboard(buttons));
            return;
        }
    }

    // 3. Otherwise treat as full command execution
    await ctx.reply(`Executing: ${text}...`);
    const output = await executeCommand(text);

    // Check if output contains a file path that looks like an artifact (e.g. screenshot or photo)
    const fileMatch = output.match(/(Screenshot|Photo|Image) saved to (.*?)(\s|$)/);
    if (fileMatch && fileMatch[2]) {
        const filePath = fileMatch[2].trim();
        const cleanPath = filePath.replace(/\.$/, '');

        if (fs.existsSync(cleanPath)) {
            await ctx.replyWithPhoto({ source: cleanPath });
        }
    }

    // 4. Extract Post-Processing Context Buttons
    let finalMarkup = getMainMenu();
    const dynamicButtons = [];

    if (toolModule && toolModule.getTelegramPostProcessor) {
        const postOps = await toolModule.getTelegramPostProcessor(text, output);
        if (postOps && postOps.buttons) {
            postOps.buttons.forEach(row => {
                dynamicButtons.push(row.map(btn => Markup.button.callback(btn.text, btn.callback)));
            });
        }
    }

    if (dynamicButtons.length > 0) {
        dynamicButtons.push([Markup.button.callback('🔙 Main Menu', 'cmd_menu')]);
        finalMarkup = Markup.inlineKeyboard(dynamicButtons);
    }

    // Send text output (truncate if too long)
    if (output.length > 4000) {
        await ctx.reply(output.substring(0, 4000) + '... (truncated)', finalMarkup);
    } else {
        await ctx.reply(output, finalMarkup);
    }
}

// Handle text messages
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.toLowerCase() === 'menu') {
        await ctx.reply('Select a quick action:', getMainMenu());
        return;
    }
    await executeAndReply(ctx, text);
});

// Error Handling
bot.catch((err, ctx) => {
    log(`Bot Error for ${ctx.updateType}: ${err.message}`);
    // Do not crash, just log
});

// Bot Start/Restart Logic
let isRestarting = false;

async function startBot() {
    if (isRestarting) return;
    isRestarting = true;

    try {
        log('Starting bot...');
        // Stop if running (ignore error)
        try { bot.stop(); } catch (e) { }

        await bot.launch();
        log('Bot started successfully.');
        isRestarting = false;
    } catch (err) {
        log(`Bot launch failed or crashed: ${err.message}`);
        console.error('Bot launch error:', err);
        isRestarting = false;

        // Wait 5 seconds and retry
        log('Retrying in 5 seconds...');
        setTimeout(startBot, 5000);
    }
}

startBot();

// Enable graceful stop
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit(0);
});

// Global Exception Handlers to prevent crash on timeouts & Restart
process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`);
    console.error('Uncaught Exception:', err);
    if (err.message.includes('Timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('network')) {
        log('Network/Timeout error detected. Restarting bot...');
        setTimeout(startBot, 2000);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    log(`Unhandled Rejection: ${msg}`);
    console.error('Unhandled Rejection:', reason);
    if (msg.includes('Timeout') || msg.includes('ETIMEDOUT') || msg.includes('network')) {
        log('Network/Timeout error detected. Restarting bot...');
        setTimeout(startBot, 2000);
    }
});
