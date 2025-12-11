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
