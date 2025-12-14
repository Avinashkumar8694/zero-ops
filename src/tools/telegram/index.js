import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig } from '../../utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (program, toolName) {
    const pidFile = path.join(os.homedir(), '.zero-ops', 'telegram.pid');

    // Ensure .zero-ops dir exists
    const zeroOpsDir = path.dirname(pidFile);
    if (!fs.existsSync(zeroOpsDir)) {
        fs.mkdirSync(zeroOpsDir, { recursive: true });
    }

    // Handlers use shared utils now

    program.description('Control zero-ops remotely via Telegram bot');

    // Config commands
    const configCommand = program.command('config').description('Configure Telegram bot settings');

    configCommand
        .command('set <key> <value>')
        .description('Set configuration (keys: token, chat_id)')
        .action((key, value) => {
            if (!['token', 'chat_id'].includes(key)) {
                console.error('Invalid key. Allowed keys: token, chat_id');
                return;
            }
            const config = loadConfig();
            if (!config[toolName]) config[toolName] = {};
            config[toolName][key] = value;
            saveConfig(config);
            console.log(`Telegram ${key} set.`);
        });

    configCommand
        .command('get <key>')
        .description('Get configuration value')
        .action((key) => {
            const config = loadConfig();
            if (config[toolName] && config[toolName][key]) {
                console.log(config[toolName][key]);
            } else {
                console.log(`No value set for ${key}`);
            }
        });

    // Process Managment
    program
        .command('start')
        .description('Start the Telegram bot daemon in background')
        .action(() => {
            const config = loadConfig();
            if (!config[toolName]?.token || !config[toolName]?.chat_id) {
                console.error('Error: Token and Chat ID must be configured first.');
                return;
            }

            if (fs.existsSync(pidFile)) {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
                try {
                    process.kill(pid, 0); // Check if running
                    console.log(`Telegram bot is already running (PID: ${pid})`);
                    return;
                } catch (e) {
                    // Stale PID file
                    fs.unlinkSync(pidFile);
                }
            }

            const daemonScript = path.join(__dirname, 'daemon.js');
            const logFile = path.join(zeroOpsDir, 'telegram.log');
            const out = fs.openSync(logFile, 'a');
            const err = fs.openSync(logFile, 'a');

            const subprocess = spawn(process.execPath, [daemonScript], {
                detached: true,
                stdio: ['ignore', out, err],
                env: { ...process.env, ZERO_OPS_TOOL_NAME: toolName }
            });

            subprocess.unref();
            fs.writeFileSync(pidFile, subprocess.pid.toString());
            console.log(`Telegram bot started (PID: ${subprocess.pid}, Log: ${logFile})`);
        });

    program
        .command('stop')
        .description('Stop the Telegram bot daemon')
        .action(() => {
            if (!fs.existsSync(pidFile)) {
                console.log('Telegram bot is not running (no PID file).');
                return;
            }
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
            try {
                process.kill(pid);
                console.log(`Telegram bot stopped (PID: ${pid})`);
            } catch (e) {
                console.log(`Failed to stop process ${pid}: ${e.message}`);
            } finally {
                fs.unlinkSync(pidFile);
            }
        });

    program
        .command('status')
        .description('Check status of Telegram bot')
        .action(() => {
            const config = loadConfig();
            const logFile = path.join(zeroOpsDir, 'telegram.log');
            let statusData = {
                'Status': 'Stopped',
                'PID': 'N/A',
                'Bot Token': config[toolName]?.token ? '******' + config[toolName].token.slice(-4) : 'Not Set',
                'Chat ID': config[toolName]?.chat_id || 'Not Set',
                'Log File': logFile
            };

            if (fs.existsSync(pidFile)) {
                const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
                try {
                    process.kill(pid, 0);
                    statusData['Status'] = 'Running';
                    statusData['PID'] = pid.toString();
                } catch (e) {
                    statusData['Status'] = 'Stopped (Stale PID)';
                }
            }

            console.table([statusData]);
        });

    program
        .command('logs')
        .description('Follow the Telegram bot logs')
        .action(() => {
            const logFile = path.join(zeroOpsDir, 'telegram.log');
            if (!fs.existsSync(logFile)) {
                console.log('No log file found. Has the bot been started?');
                return;
            }

            console.log(`Tailing log file: ${logFile}`);
            const tail = spawn('tail', ['-f', logFile], { stdio: 'inherit' });

            tail.on('error', (err) => {
                console.error(`Failed to start tail: ${err.message}`);
            });
        });

    program.addHelpText('after', `
Examples:
  Configure bot:
    $ zero-ops telegram config set token "YOUR_BOT_TOKEN"
    $ zero-ops telegram config set chat_id "YOUR_CHAT_ID"
  
  Start bot:
    $ zero-ops telegram start
  
  Stop bot:
    $ zero-ops telegram stop

  Follow logs:
    $ zero-ops telegram logs
    `);
}
