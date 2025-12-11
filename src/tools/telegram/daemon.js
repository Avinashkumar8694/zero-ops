import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..'); // snippent root (package.json location)
const zeroOpsScript = path.join(projectRoot, 'zero-ops.js');

const toolName = process.env.ZERO_OPS_TOOL_NAME || 'telegram';
const configPath = path.join(os.homedir(), '.zero-ops-config.json');

// Log helper
function log(msg) {
    const logFile = path.join(os.homedir(), '.zero-ops', 'telegram.log');
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
}

// Load config
let config = {};
try {
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {
    log(`Error loading config: ${e.message}`);
    process.exit(1);
}

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
function executeCommand(cmdStr) {
    return new Promise((resolve) => {
        // Construct full command: node zero-ops.js <cmdStr>
        // cmdStr e.g. "desktop list"
        const fullCmd = `${process.execPath} "${zeroOpsScript}" ${cmdStr}`;
        log(`Executing: ${fullCmd}`);

        exec(fullCmd, (error, stdout, stderr) => {
            if (error) {
                log(`Error execution: ${error.message}`);
                resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                return;
            }
            resolve(stdout || stderr || 'Command executed empty output.');
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

    // Check if output contains a file path that looks like an artifact (e.g. screenshot)
    // "Screenshot saved to /path/to/file.png"
    const fileMatch = output.match(/Screenshot saved to (.*?) and/);
    if (fileMatch && fileMatch[1]) {
        const filePath = fileMatch[1].trim();
        if (fs.existsSync(filePath)) {
            await ctx.replyWithPhoto({ source: filePath });
        }
    }

    // Send text output (truncate if too long)
    if (output.length > 4000) {
        ctx.reply(output.substring(0, 4000) + '... (truncated)');
    } else {
        ctx.reply(output);
    }
});

bot.launch();
log('Bot started.');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
