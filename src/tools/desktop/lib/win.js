import { exec } from 'child_process';

export function listApps() {
    return new Promise((resolve, reject) => {
        const script = 'Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object -ExpandProperty ProcessName';
        exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const apps = stdout.trim().split(/\r?\n/).filter(line => line.trim() !== '');
            // Remove duplicates
            const uniqueApps = [...new Set(apps)];
            resolve(uniqueApps);
        });
    });
}

export function minimizeApp(appName) {
    return new Promise((resolve, reject) => {
        // This is a basic implementation. Minimizing specific windows reliably via PowerShell
        // without external tools (like WASP or C# embedding) is complex.
        // This uses a Shell.Application approach to minimize all windows, as essentially a placeholder,
        // or we could warn.
        // Better approach for specific app: use a C# inline snippet.

        // For now, we will return a not implemented warning or best-effort.
        // Let's try a best effort "Minimize All" as minimizing a specific PID is hard pure PS.
        // Actually, we can just warn for now as per plan "best-effort code blocks".

        resolve(`Windows minimize for "${appName}" is not fully implemented yet. Please use native window controls.`);
    });
}

export function minimizeAll() {
    return new Promise((resolve, reject) => {
        const script = '(New-Object -ComObject Shell.Application).MinimizeAll()';
        exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve('All windows minimized.');
        });
    });
}

export function closeApp(appName) {
    return new Promise((resolve, reject) => {
        const script = `(Get-Process -Name "${appName}").CloseMainWindow()`;
        exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(`App "${appName}" closed request sent.`);
        });
    });
}

export function closeAll() {
    return new Promise((resolve, reject) => {
        const script = 'Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | ForEach-Object { $_.CloseMainWindow() }';
        exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve('Closed all windows (sent CloseMainWindow).');
        });
    });
}

import os from 'os';
import path from 'path';
import fs from 'fs';

export function captureScreenshot(type = 'full', toolName = 'desktop') {
    return new Promise((resolve, reject) => {
        if (type !== 'full') {
            resolve('Interactive window/region screenshot not fully supported via CLI on Windows. Please use Win+Shift+S.');
            return;
        }

        const homeDir = os.homedir();
        const toolDir = path.join(homeDir, '.zero-ops', toolName);

        // Ensure directory exists (PowerShell might need it pre-created or we do it here in node)
        if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        const filePath = path.join(toolDir, filename);

        // PowerShell script to capture full screen, save to file, and set clipboard
        const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen
        $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
        $bitmap.Save('${filePath.replace(/\\/g, '\\\\')}')
        [System.Windows.Forms.Clipboard]::SetImage($bitmap)
        $graphics.Dispose()
        $bitmap.Dispose()
        `;

        exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
        });
    });
}
