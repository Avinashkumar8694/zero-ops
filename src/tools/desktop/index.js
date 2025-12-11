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
        .command('screenshot [type]')
        .description('Capture screenshot (type: full, window, region)')
        .action(async (type = 'full') => {
            if (!platformLib) {
                console.error('Platform not supported.');
                return;
            }
            try {
                console.log(`Taking ${type} screenshot...`);
                // Interactive modes might need time/user interaction, so strict timeouts might be tricky
                const message = await platformLib.captureScreenshot(type, toolName);
                console.log(message);
            } catch (err) {
                console.error(`Failed to take screenshot: ${err.message}`);
            }
        });

    // Add help text
    program.addHelpText('after', `
Examples:
  List open apps:
    $ zero-ops ${toolName} desktop list

  Minimize an app:
    $ zero-ops ${toolName} desktop minimize "Google Chrome"

  Minimize all apps:
    $ zero-ops ${toolName} desktop minimize-all

  Close an app:
    $ zero-ops ${toolName} desktop close "Slack"

  Close all apps:
    $ zero-ops ${toolName} desktop close-all

  Take screenshot (Full Screen):
    $ zero-ops ${toolName} desktop screenshot

  Take screenshot (Interactive Window):
    $ zero-ops ${toolName} desktop screenshot window

  Take screenshot (Interactive Region):
    $ zero-ops ${toolName} desktop screenshot region
    `);
}
