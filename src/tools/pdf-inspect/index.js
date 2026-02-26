// src/tools/pdf-inspect/index.js
// PDF Inspector tool — opens a local server and browser-based PDF viewer
// Works cross-platform: macOS, Windows, Linux

import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (program, toolName) {
    program.description('Inspect PDF files — view and hover over elements to see styling properties.');

    program
        .argument('<filePath>', 'Path to the PDF file to inspect')
        .option('-p, --port <port>', 'Port for the local server', '8377')
        .action(async (filePath, options) => {
            const resolvedPath = path.resolve(filePath);

            // Validate file exists
            if (!fs.existsSync(resolvedPath)) {
                console.error(`Error: File not found: ${resolvedPath}`);
                process.exit(1);
            }

            // Validate it's a PDF
            if (!resolvedPath.toLowerCase().endsWith('.pdf')) {
                console.error('Error: File must be a .pdf');
                process.exit(1);
            }

            const port = parseInt(options.port, 10);
            const viewerHtmlPath = path.join(__dirname, 'viewer.html');

            if (!fs.existsSync(viewerHtmlPath)) {
                console.error('Error: viewer.html not found. Package may be corrupted.');
                process.exit(1);
            }

            // Create server
            const server = http.createServer((req, res) => {
                if (req.url === '/' || req.url === '/index.html') {
                    // Serve the viewer HTML
                    const html = fs.readFileSync(viewerHtmlPath, 'utf-8');
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(html);
                } else if (req.url === '/pdf') {
                    // Serve the PDF file
                    const stat = fs.statSync(resolvedPath);
                    res.writeHead(200, {
                        'Content-Type': 'application/pdf',
                        'Content-Length': stat.size,
                        'Content-Disposition': 'inline',
                    });
                    const stream = fs.createReadStream(resolvedPath);
                    stream.pipe(res);
                } else if (req.url === '/filename') {
                    // Return original filename for download
                    const baseName = path.basename(resolvedPath, '.pdf');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ name: baseName }));
                } else {
                    res.writeHead(404);
                    res.end('Not found');
                }
            });

            server.listen(port, () => {
                const url = `http://localhost:${port}`;
                console.log(`\n  🔍 PDF Inspector running at ${url}`);
                console.log(`  📄 File: ${resolvedPath}`);
                console.log(`  Press Ctrl+C to stop.\n`);

                // Open browser — cross-platform
                openBrowser(url);
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`Error: Port ${port} is already in use. Try --port <other_port>`);
                } else {
                    console.error(`Server error: ${err.message}`);
                }
                process.exit(1);
            });

            // Track open connections for clean shutdown
            const connections = new Set();
            server.on('connection', (conn) => {
                connections.add(conn);
                conn.on('close', () => connections.delete(conn));
            });

            // Graceful shutdown
            const shutdown = () => {
                console.log('\n  Shutting down PDF Inspector...');
                // Destroy all open connections immediately
                for (const conn of connections) {
                    conn.destroy();
                }
                server.close(() => process.exit(0));
                // Force exit after 1s if server.close hangs
                setTimeout(() => process.exit(0), 1000);
            };
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        });

    program.addHelpText('after', `
Examples:
  Inspect a PDF:
    $ zero-ops pdf-inspect ./document.pdf

  Use a custom port:
    $ zero-ops pdf-inspect ./report.pdf --port 9000
    `);
}

/**
 * Opens the default browser on any OS.
 * macOS: open, Windows: start, Linux: xdg-open
 */
function openBrowser(url) {
    const platform = process.platform;
    let cmd;

    if (platform === 'darwin') {
        cmd = `open "${url}"`;
    } else if (platform === 'win32') {
        cmd = `start "" "${url}"`;
    } else {
        // Linux and others
        cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => {
        if (err) {
            console.log(`  ⚠  Could not open browser automatically. Open ${url} manually.`);
        }
    });
}
