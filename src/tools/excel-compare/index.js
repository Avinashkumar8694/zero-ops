import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import http from 'http';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for global configuration
const configPath = path.join(os.homedir(), '.zero-ops-excel-compare.json');

// Read config
function readConfig() {
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            console.error('[Excel Compare] Failed to read config file:', e.message);
        }
    }
    return {};
}

// Write config
function writeConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('[Excel Compare] Failed to write config file:', e.message);
    }
}

export default async function (program, toolName) {
    program
        .description('Premium Excel Data Comparator & Reconciliation Engine')
        .addHelpText('after', `
Example Workflows:
  1. Setup Local AI (Ollama):
     $ zero-ops excel-compare config set aiProvider ollama
     $ zero-ops excel-compare config set ollamaModel llama3
     $ zero-ops excel-compare

  2. Setup Cloud AI (OpenAI):
     $ zero-ops excel-compare config set aiProvider openai
     $ zero-ops excel-compare config set openAiKey sk-proj-xxxx...
     $ zero-ops excel-compare

  3. Define a Global Primary Key:
     $ zero-ops excel-compare config set defaultPrimaryKey "Employee ID"
     $ zero-ops excel-compare

Notes:
  - The tool starts a local web server (default: http://localhost:8378).
  - All Excel parsing and diffing happens safely inside your browser.
  - Supports .xlsx, .xlsm, .xls, and .csv formats.
`);

    // Sub-command: config
    const configCmd = program.command('config')
        .description('Manage Excel Compare configuration settings');

    configCmd.command('set <key> <value>')
        .description('Set a configuration value (e.g. openAiKey, aiProvider, ollamaModel, defaultPrimaryKey)')
        .action((key, value) => {
            const config = readConfig();
            // Handle booleans
            if (value.toLowerCase() === 'true') value = true;
            else if (value.toLowerCase() === 'false') value = false;
            
            config[key] = value;
            writeConfig(config);
            console.log(`[Excel Compare] Config updated: ${key} = ${value}`);
        });

    configCmd.command('get [key]')
        .description('Get a standard configuration value, or all if none provided')
        .action((key) => {
            const config = readConfig();
            if (key) {
                console.log(config[key] !== undefined ? config[key] : `Key '${key}' not found.`);
            } else {
                console.log('[Excel Compare] Current Configuration:');
                console.log(JSON.stringify(config, null, 2));
            }
        });

    // Detailed Help Section for Config
    configCmd.addHelpText('after', `
Available Configuration Keys:
  aiProvider         : The active AI backend. "openai" or "ollama"
  openAiKey          : Your OpenAI API Key (sk-...)
  ollamaUrl          : URL for local Ollama API (default: http://localhost:11434/api/generate)
  ollamaModel        : Ollama model to use for insights (default: llama3)
  defaultPrimaryKey  : Default column name to use as Primary Key (e.g. ID, Email)
  lookaheadDistance  : How many rows to scan ahead to automatically align added/deleted rows when no PK is used (default: 50)
  similarityThreshold: Minimum match ratio needed to treat misaligned rows as Modified instead of Deleted/Added (0.0 - 1.0, default: 0.5)
  ignoreCase         : "true" to ignore string casing during diff

Examples:
  $ zero-ops excel-compare config set aiProvider ollama
  $ zero-ops excel-compare config set defaultPrimaryKey "Transaction_ID"
  $ zero-ops excel-compare config get
`);

    // Default action (starts server)
    program.action(async () => {
        // Start Local Server to host the web interface
        const port = process.env.PORT || 8378; // Different port to avoid conflict
        
        const server = http.createServer((req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Route: Serve UI (viewer.html)
            if (req.url === '/' && req.method === 'GET') {
                const viewerPath = path.join(__dirname, 'viewer.html');
                if (fs.existsSync(viewerPath)) {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    });
                    res.end(fs.readFileSync(viewerPath));
                } else {
                    res.writeHead(404);
                    res.end('UI not found.');
                }
                return;
            }

            // Route: Get Config from Frontend
            if (req.url === '/api/config' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(readConfig()));
                return;
            }

            // Route: POST Config from Frontend
            if (req.url === '/api/config' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const newConfig = JSON.parse(body);
                        const config = readConfig();
                        Object.assign(config, newConfig);
                        writeConfig(config);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch(e) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to save config' }));
                    }
                });
                return;
            }

            // Route: Proxy AI insights 
            if (req.url === '/api/ai-summary' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    const config = readConfig();
                    const provider = config.aiProvider || 'openai';
                    const promptMsg = 'You are a senior financial analyst. Review the following changes between Version A and Version B of this spreadsheet. Calculate the net difference in key numerical columns. Summarize the top 3 most impactful changes. Output your response in Markdown format. If the provided JSON data is empty or indicates no changes, simply respond exactly with "✅ The files are perfectly identical. There are no changes to report."';
                    
                    try {
                        const payload = JSON.parse(body);

                        if (provider === 'openai') {
                            if (!config.openAiKey) {
                                res.writeHead(400); res.end(JSON.stringify({ error: 'OpenAI API Key not configured. Use `zero-ops excel-compare config set openAiKey <key>`' }));
                                return;
                            }
                            
                            const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openAiKey}` },
                                body: JSON.stringify({
                                    model: 'gpt-4o',
                                    messages: [
                                        { role: 'system', content: promptMsg },
                                        { role: 'user', content: JSON.stringify(payload.diff) }
                                    ]
                                })
                            });

                            const data = await aiRes.json();
                            if (aiRes.ok) {
                                res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ summary: data.choices[0].message.content }));
                            } else {
                                res.writeHead(aiRes.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: data.error?.message || 'OpenAI API failed' }));
                            }

                        } else if (provider === 'ollama') {
                            const ollamaUrl = config.ollamaUrl || 'http://localhost:11434/api/generate';
                            const ollamaModel = config.ollamaModel || 'llama3';
                            
                            const aiRes = await fetch(ollamaUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    model: ollamaModel,
                                    prompt: `${promptMsg}\n\nData:\n${JSON.stringify(payload.diff)}`,
                                    stream: false
                                })
                            });

                            const data = await aiRes.json();
                            if (aiRes.ok) {
                                res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ summary: data.response }));
                            } else {
                                res.writeHead(aiRes.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: data.error || 'Ollama API failed' }));
                            }
                        } else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Unknown aiProvider: ${provider}. Use 'openai' or 'ollama'.` }));
                        }

                    } catch(e) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ error: 'Internal Server Error' }));
                    }
                });
                return;
            }

            res.writeHead(404);
            res.end('');
        });

        server.listen(port, async () => {
            console.log(`\n\n📊 Excel Compare Tool running at http://localhost:${port}`);
            console.log(`Press Ctrl+C to stop.`);
            
            // Optionally auto-open the browser using an OS command
            const platform = os.platform();
            const openUrl = `http://localhost:${port}`;
            const exec = (await import('child_process')).exec;
            if (platform === 'darwin') exec(`open ${openUrl}`);
            else if (platform === 'win32') exec(`start ${openUrl}`);
            else exec(`xdg-open ${openUrl}`);
        });
    });
}
