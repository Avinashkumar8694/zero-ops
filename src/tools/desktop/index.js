// src/tools/desktop/index.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function (program, toolName) {
    let platformLib;

    // Determine platform and load appropriate library
    try {
        if (process.platform === 'darwin') {
            platformLib = await import('./lib/mac.js');
        } else if (process.platform === 'win32') {
            platformLib = await import('./lib/win.js');
        } else if (process.platform === 'linux') {
            platformLib = await import('./lib/linux.js');
        } else {
            console.warn(`Warning: Platform '${process.platform}' is not supported by the desktop tool.`);
        }
    } catch (err) {
        console.error(`Error loading platform library: ${err.message}`);
    }

    program.description('Desktop management: list, minimize, close, and capture screenshots of applications.');

    // List command
    program
        .command('list')
        .description('List running applications/windows')
        .action(async () => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                const apps = await platformLib.listApps();
                if (apps.length === 0) {
                    console.log('No visible applications found.');
                } else {
                    console.log('Running Applications:');
                    apps.forEach(app => console.log(` - ${app}`));
                }
            } catch (err) {
                console.error(`Failed to list apps: ${err.message}`);
            }
        });

    // Minimize command
    program
        .command('minimize <appName>')
        .description('Minimize (hide) an application by name')
        .action(async (appName) => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                const message = await platformLib.minimizeApp(appName);
                console.log(message);
            } catch (err) {
                console.error(`Failed to minimize app '${appName}': ${err.message}`);
            }
        });

    // Minimize All command
    program
        .command('minimize-all')
        .description('Minimize all open windows')
        .action(async () => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                const message = await platformLib.minimizeAll();
                console.log(message);
            } catch (err) {
                console.error(`Failed to minimize all: ${err.message}`);
            }
        });

    // Close command
    program
        .command('close <appName>')
        .description('Close (quit) an application by name')
        .action(async (appName) => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                const message = await platformLib.closeApp(appName);
                console.log(message);
            } catch (err) {
                console.error(`Failed to close app '${appName}': ${err.message}`);
            }
        });

    // Close All command
    program
        .command('close-all')
        .description('Close (quit) all open applications')
        .action(async () => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                const message = await platformLib.closeAll();
                console.log(message);
            } catch (err) {
                console.error(`Failed to close all apps: ${err.message}`);
            }
        });

    // Screenshot command
    program
        .command('screenshot [type] [name]')
        .description('Capture screenshot (type: full, window)')
        .action(async (type = 'full', name) => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                console.log(`Taking ${type} screenshot${name ? ' of ' + name : ''}...`);
                // Interactive modes might need time/user interaction, so strict timeouts might be tricky
                const message = await platformLib.captureScreenshot(type, toolName, name);
                console.log(message);
            } catch (err) {
                console.error(`Failed to take screenshot: ${err.message}`);
            }
        });

    // Add help text
    program.addHelpText('after', `
Examples:
  List open apps:
    $ zero-ops desktop list

  Minimize an app:
    $ zero-ops desktop minimize "Google Chrome"

  Minimize all apps:
    $ zero-ops desktop minimize-all

  Close an app:
    $ zero-ops desktop close "Slack"

  Close all apps:
    $ zero-ops desktop close-all

  Take screenshot (Full Screen):
    $ zero-ops desktop screenshot

    Take screenshot (Named Window):
    $ zero-ops desktop screenshot window "Google Chrome"
    `);
}

/**
 * Telegram UI Hook: Provides dynamic interactive buttons for parameterless commands.
 */
export async function getTelegramInterceptor(cmdText, executeCommand) {
    if (cmdText === 'desktop close' || cmdText === 'desktop minimize') {
        const action = cmdText.split(' ')[1];
        
        const desktopOutput = await executeCommand('desktop list');
        const appMatches = [...desktopOutput.matchAll(/^\s*-\s+(.+)$/gm)];
        const apps = [...new Set(appMatches.map(m => m[1].trim()))].slice(0, 15);
        
        if (apps.length === 0) {
            return { message: `No active applications found to ${action}.`, buttons: [] };
        }

        const buttons = [];
        apps.forEach(app => {
            const shortApp = app.length > 25 ? app.substring(0, 25) + '...' : app;
            const callbackApp = app.length > 35 ? app.substring(0, 35) : app;
            const icon = action === 'close' ? '❌' : '📉';
            buttons.push([{ text: `${icon} ${shortApp}`, callback: `cmd_desktop ${action} "${callbackApp}"` }]);
        });
        
        return { message: `Select an application to ${action}:`, buttons };
    }
    return null;
}

/**
 * Telegram UI Hook: Appends dynamic context buttons to string outputs.
 */
export async function getTelegramPostProcessor(cmdText, outputText) {
    if (cmdText.trim().startsWith('desktop list')) {
        const dynamicButtons = [];
        const appMatches = [...outputText.matchAll(/^\s*-\s+(.+)$/gm)];
        const apps = [...new Set(appMatches.map(m => m[1].trim()))].slice(0, 6);
        
        apps.forEach(app => {
            const shortApp = app.length > 25 ? app.substring(0, 25) + '...' : app;
            const callbackApp = app.length > 35 ? app.substring(0, 35) : app;
            dynamicButtons.push([
                { text: `📉 Min ${shortApp}`, callback: `cmd_desktop minimize "${callbackApp}"` },
                { text: `❌ Close ${shortApp}`, callback: `cmd_desktop close "${callbackApp}"` }
            ]);
        });
        
        return { buttons: dynamicButtons };
    }
    return null;
}
