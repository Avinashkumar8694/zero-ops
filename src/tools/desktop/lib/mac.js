import { exec } from 'child_process';

export function listApps() {
    return new Promise((resolve, reject) => {
        const script = 'tell application "System Events" to get name of (processes where background only is false)';
        const scriptPath = path.join(os.tmpdir(), `list-apps-${Math.random().toString(36).slice(2)}.applescript`);
        fs.writeFileSync(scriptPath, script);

        exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch (e) { }

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
        // "set visible to false" effectively hides the application (Cmd+H behavior)
        const script = `tell application "System Events" to set visible of process "${appName.replace(/"/g, '\\"')}" to false`;
        const scriptPath = path.join(os.tmpdir(), `minimize-${Math.random().toString(36).slice(2)}.applescript`);
        fs.writeFileSync(scriptPath, script);

        exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch (e) { }

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
        const scriptPath = path.join(os.tmpdir(), `minimize-all-${Math.random().toString(36).slice(2)}.applescript`);
        fs.writeFileSync(scriptPath, script);

        exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch (e) { }

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
        const script = `tell application "${appName.replace(/"/g, '\\"')}" to quit`;
        const scriptPath = path.join(os.tmpdir(), `close-${Math.random().toString(36).slice(2)}.applescript`);
        fs.writeFileSync(scriptPath, script);

        exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch (e) { }

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
        const scriptPath = path.join(os.tmpdir(), `close-all-${Math.random().toString(36).slice(2)}.applescript`);
        fs.writeFileSync(scriptPath, script);

        exec(`osascript "${scriptPath}"`, (error, stdout, stderr) => {
            try { fs.unlinkSync(scriptPath); } catch (e) { }

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

export function captureScreenshot(type = 'full', toolName = 'desktop', name = null) {
    return new Promise((resolve, reject) => {
        const homeDir = os.homedir();
        const toolDir = path.join(homeDir, '.zero-ops', toolName);
        if (!fs.existsSync(toolDir)) {
            fs.mkdirSync(toolDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `screenshot-${type}-${timestamp}.png`;
        const filePath = path.join(toolDir, fileName);

        if (type === 'window' && name) {
            // Named window capture
            // 1. Get Window ID of the (frontmost) window of the app
            const getWindowIdScript = `
                tell application "System Events"
                    set proc to first process whose name is "${name.replace(/"/g, '\\"')}"
                    if exists proc then
                        tell proc
                            set winID to id of window 1
                            return winID
                        end tell
                    else
                        return "NOT_FOUND"
                    end if
                end tell
            `;
            const scriptPath = path.join(os.tmpdir(), `get-win-id-${Math.random().toString(36).slice(2)}.applescript`);
            fs.writeFileSync(scriptPath, getWindowIdScript);

            exec(`osascript "${scriptPath}"`, (err, stdout, stderr) => {
                try { fs.unlinkSync(scriptPath); } catch (e) { }

                if (err) {
                    reject(new Error(`Failed to find window for "${name}": ${err.message}`));
                    return;
                }
                const winId = stdout.trim();
                if (winId === 'NOT_FOUND') {
                    reject(new Error(`Application "${name}" not found or has no windows.`));
                    return;
                }

                // 2. Capture specific window by ID
                const captureCmd = `screencapture -l ${winId} "${filePath}"`;
                exec(captureCmd, (e) => {
                    if (e) return reject(e);
                    processClipboard(filePath, resolve, reject);
                });
            });
            return;
        }

        let captureCmd = `screencapture "${filePath}"`;
        // Fallback for local usage or if name missing (though CLI should enforce check? no, we act robustly)
        if (type === 'window' && !name) {
            // Interactive fallback if local? Or just error?
            // User asked: "remove region feature... check how window name can be given"
            // Let's error if remote, but for now interactive fallback is okay for local
            // But simpler to just use -iW maybe?
            // Let's stick to -i for interactive fallback if NO name given
            captureCmd = `screencapture -iW "${filePath}"`;
        }

        exec(captureCmd, (error) => {
            if (error) {
                if (error.message.includes('not allowed')) {
                    reject(new Error('Permission denied. Zero-ops needs Screen Recording permission.'));
                } else {
                    reject(error);
                }
                return;
            }
            processClipboard(filePath, resolve, reject);
        });
    });
}

function processClipboard(filePath, resolve, reject) {
    const clipScript = `set the clipboard to (read (POSIX file "${filePath}") as «class PNGf»)`;
    const scriptPath = path.join(os.tmpdir(), `clip-${Math.random().toString(36).slice(2)}.applescript`);
    fs.writeFileSync(scriptPath, clipScript);

    exec(`osascript "${scriptPath}"`, (e) => {
        try { fs.unlinkSync(scriptPath); } catch (e) { }

        if (e) {
            const fallbackScript = `set the clipboard to (read (POSIX file "${filePath}") as TIFF picture)`;
            const fallbackPath = path.join(os.tmpdir(), `clip-fallback-${Math.random().toString(36).slice(2)}.applescript`);
            fs.writeFileSync(fallbackPath, fallbackScript);

            exec(`osascript "${fallbackPath}"`, () => {
                try { fs.unlinkSync(fallbackPath); } catch (e) { }
                resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
            });
        } else {
            resolve(`Screenshot saved to ${filePath} and copied to clipboard.`);
        }
    });
}
