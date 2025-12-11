import { exec } from 'child_process';

export function listApps() {
    return new Promise((resolve, reject) => {
        const script = 'tell application "System Events" to get name of (processes where background only is false)';
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (!stdout || !stdout.trim()) {
                resolve([]);
                return;
            }
            const apps = stdout.trim().split(', ');
            resolve(apps);
        });
    });
}

export function minimizeApp(appName) {
    return new Promise((resolve, reject) => {
        // "set visible to false" effectively hides the application (Cmd+H behavior),
        // which is often more reliable than trying to minimize specific windows via AppleScript.
        const script = `tell application "System Events" to set visible of process "${appName}" to false`;
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(`App "${appName}" hidden (minimized).`);
        });
    });
}

export function minimizeAll() {
    return new Promise((resolve, reject) => {
        const script = 'tell application "System Events" to set visible of (every process where background only is false) to false';
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve('All applications hidden (minimized).');
        });
    });
}

export function closeApp(appName) {
    return new Promise((resolve, reject) => {
        // "quit" is the standard AppleScript command to close an app gracefully
        const script = `tell application "${appName}" to quit`;
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(`App "${appName}" closed.`);
        });
    });
}

export function closeAll() {
    return new Promise((resolve, reject) => {
        // Get non-background apps and quit them
        // Note: This asks every app to quit. Some might prompt for saving.
        const script = `
        tell application "System Events"
            set appList to name of (processes where background only is false)
        end tell
        repeat with appName in appList
            if appName is not "Terminal" then
                tell application appName to quit
            end if
        end repeat
        `;
        exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve('All applications closed (except Terminal).');
        });
    });
}


import os from 'os';
import path from 'path';
import fs from 'fs';

export function captureScreenshot(type = 'full', toolName = 'desktop') {
    return new Promise((resolve, reject) => {
        const homeDir = os.homedir();
        const toolDir = path.join(homeDir, '.zero-ops', toolName);

        // Ensure directory exists
        if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        const filePath = path.join(toolDir, filename);

        // Revised command strategy:
        // - Full: screencapture <file>
        // - Window: screencapture -i <file> (User MUST press Space to toggle window mode)
        // - Region: screencapture -i <file>

        let captureCmd = `screencapture "${filePath}"`;
        let instructions = '';

        if (type === 'window') {
            // -W and -i -W are flaky on some systems. -i is reliable.
            captureCmd = `screencapture -i "${filePath}"`;
            instructions = ' (Interactive Mode: Press SPACE to capture a window)';
        }
        if (type === 'region') {
            captureCmd = `screencapture -i "${filePath}"`;
            instructions = ' (Interactive Mode: Select region)';
        }

        console.log(`Saving to: ${filePath}${instructions}`);

        exec(captureCmd, (error, stdout, stderr) => {
            if (error) {
                if (stderr && stderr.includes('could not create image from window')) {
                    reject(new Error('not allowed to take screenshot (window capture failed)'));
                } else if (error.message && error.message.includes('could not create image from window')) {
                    reject(new Error('not allowed to take screenshot (window capture failed)'));
                } else {
                    reject(error);
                }
                return;
            }

            // Usage of «class PNGf» is more robust for PNG files in AppleScript
            const clipScript = `set the clipboard to (read (POSIX file "${filePath}") as «class PNGf»)`;
            exec(`osascript -e '${clipScript}'`, (e, out, err) => {
                if (e) {
                    // Fallback
                    const fallbackScript = `set the clipboard to (read (POSIX file "${filePath}") as TIFF picture)`;
                    exec(`osascript -e '${fallbackScript}'`, (e2) => {
                        if (e2) console.warn('Warning: Failed to copy to clipboard.');
                        resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
                    });
                } else {
                    resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
                }
            });
        });
    });
}
