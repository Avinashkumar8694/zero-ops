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
