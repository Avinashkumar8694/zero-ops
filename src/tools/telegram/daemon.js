import { Telegraf } from 'telegraf';
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

// Start command
bot.start((ctx) => {
    const tools = getAvailableTools();
    ctx.reply(`Welcome to zero-ops remote!\nAvailable tools:\n${tools.map(t => `- ${t}`).join('\n')}\n\nSend "commands" to see all examples.\nSend a tool name to see specific commands.`);
});

// Handle text messages
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const tools = getAvailableTools();

    // 1. Check if text is just a tool name
    if (tools.includes(text)) {
        // Discovery: try to get help for tool
        // Run: zero-ops <tool> --help
        const helpOutput = await executeCommand(`${text} --help`);

        // Parse commands from help output (simple regex/parsing)
        // Usually "Commands:\n  cmd1 ...\n  cmd2 ..."
        // This is a rough parser
        const lines = helpOutput.split('\n');
        const commands = [];
        let inCommandsSection = false;

        for (const line of lines) {
            if (line.trim().startsWith('Commands:')) {
                inCommandsSection = true;
                continue;
            }
            if (inCommandsSection && line.trim() === '') break; // End of section?
            if (inCommandsSection && line.trim().startsWith('Examples:')) break;

            if (inCommandsSection) {
                const match = line.match(/^\s+([\w-]+)/);
                if (match) commands.push(match[1]);
            }
        }

        if (commands.length > 0) {
            // Reply with buttons or list
            // Using keyboard for quick access
            ctx.reply(`Tool: ${text}\nAvailable commands:`, {
                reply_markup: {
                    keyboard: commands.map(c => [`${text} ${c}`]),
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            });
        } else {
            ctx.reply(helpOutput); // Fallback to raw help
        }
        return;
    }

    // 2. Otherwise treat as full command execution
    ctx.reply(`Executing: ${text}...`);
    const output = await executeCommand(text);

    // Check if output contains a file path that looks like an artifact (e.g. screenshot or photo)
    // "Screenshot saved to /path/to/file.png" or "Photo saved to /path/to/file.jpg"
    const fileMatch = output.match(/(Screenshot|Photo|Image) saved to (.*?)(\s|$)/);
    if (fileMatch && fileMatch[2]) {
        const filePath = fileMatch[2].trim();
        // Remove trailing period if present (often in sentences)
        const cleanPath = filePath.replace(/\.$/, '');

        if (fs.existsSync(cleanPath)) {
            await ctx.replyWithPhoto({ source: cleanPath });
        }
    }

    // Send text output (truncate if too long)
    if (output.length > 4000) {
        ctx.reply(output.substring(0, 4000) + '... (truncated)');
    } else {
        ctx.reply(output);
    }
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
