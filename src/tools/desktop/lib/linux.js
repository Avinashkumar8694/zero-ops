import { exec } from 'child_process';

export function listApps() {
    return new Promise((resolve, reject) => {
        // Check for wmctrl
        exec('which wmctrl', (err) => {
            if (err) {
                return reject(new Error('wmctrl is not installed. Please install it (e.g., sudo apt install wmctrl).'));
            }
            exec('wmctrl -l', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                // Output format: WindowID DesktopID MachineName WindowTitle
                // We want WindowTitle.
                const apps = stdout.split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const parts = line.split(' ');
                        // Join parts from index 3 onwards for title, machine name usually index 2
                        // wmctrl output: 0x02800003  0 hostname Window Title
                        // Actually hostname is index 2. Title starts at index 3.
                        return parts.slice(3).join(' ');
                    });
                resolve([...new Set(apps)]);
            });
        });
    });
}

export function minimizeApp(appName) {
    return new Promise((resolve, reject) => {
        exec('which wmctrl', (err) => {
            if (err) {
                return reject(new Error('wmctrl is not installed. Please install it.'));
            }
            exec(`wmctrl -r "${appName}" -b add,hidden`, (error, stdout, stderr) => {
                if (error) {
                    // Start strict match failed, try substring match is default for -r? 
                    // -r uses substring match by default.
                    reject(error);
                    return;
                }
                resolve(`App "${appName}" minimized.`);
            });
        });
    });
}

export function minimizeAll() {
    return new Promise((resolve, reject) => {
        exec('which wmctrl', (err) => {
            if (err) {
                return reject(new Error('wmctrl is not installed. Please install it.'));
            }
            // "Show Desktop" mode ON
            exec('wmctrl -k on', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve('All windows minimized (Show Desktop mode).');
            });
        });
    });
}

export function closeApp(appName) {
    return new Promise((resolve, reject) => {
        exec(`wmctrl -c "${appName}"`, (error, stdout, stderr) => {
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
        // List all windows, extract IDs or Titles, then close
        // Easier to just use wmctrl -l and loop line by line
        exec('wmctrl -l', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const lines = stdout.split('\n').filter(line => line.trim() !== '');
            // We can close by window ID to be precise
            // output: 0x02800003  0 hostname Window Title
            let promises = lines.map(line => {
                const parts = line.split(' ');
                const winId = parts[0];
                return new Promise((ros, rej) => {
                    exec(`wmctrl -ic ${winId}`, (e) => {
                        if (e) rej(e); else ros();
                    });
                });
            });

            Promise.allSettled(promises).then(() => {
                resolve('All windows closed.');
            });
        });
    });
}
