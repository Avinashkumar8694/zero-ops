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

export function captureScreenshot(type = 'full', toolName = 'desktop', name = null) {
    return new Promise((resolve, reject) => {
        const homeDir = os.homedir();
        const toolDir = path.join(homeDir, '.zero-ops', toolName);

        if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${type}-${timestamp}.png`;
        const filePath = path.join(toolDir, filename);
        // Escape backslashes for PowerShell
        const safeFilePath = filePath.replace(/\\/g, '\\\\');

        if (type === 'window' && name) {
            // Named Window Capture Logic
            const script = `
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            
            # Find process by Name or Title
            $proc = Get-Process | Where-Object { ($_.ProcessName -like "*${name}*" -or $_.MainWindowTitle -like "*${name}*") -and $_.MainWindowTitle -ne "" } | Select-Object -First 1
            
            if (-not $proc) {
                Write-Error "Application '${name}' not found."
                exit 1
            }

            # Acitvate Window by PID
            $wshell = New-Object -ComObject WScript.Shell
            $success = $wshell.AppActivate($proc.Id)
            
            if ($success) {
                Start-Sleep -Milliseconds 500
                # Alt+PrintScreen captures active window
                [System.Windows.Forms.SendKeys]::SendWait("%{PRTSC}")
                Start-Sleep -Milliseconds 500
                
                if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                    $img = [System.Windows.Forms.Clipboard]::GetImage()
                    $img.Save('${safeFilePath}')
                } else {
                    Write-Error "Clipboard empty or no image captured."
                    exit 1
                }
            } else {
                Write-Error "Failed to activate window for '${name}'."
                exit 1
            }
            `;

            exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Failed to capture named window: ${stderr || error.message}`));
                    return;
                }
                resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
            });
            return;
        }

        if (type !== 'full') {
            resolve('Interactive window/region screenshot not fully supported via CLI on Windows. Please use named window: zero-ops desktop screenshot window "AppName".');
            return;
        }

        // ... Full Logic ...
        const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $screen = [System.Windows.Forms.Screen]::PrimaryScreen
        $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
        $bitmap.Save('${safeFilePath}')
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
