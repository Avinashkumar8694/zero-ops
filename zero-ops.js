#!/usr/bin/env node
// zero-ops.js
// zero-ops.js
// Modular CLI utility for managing named paths and deleting data.

import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Get available tools
const toolsDir = path.join(__dirname, 'src', 'tools');
let toolsList = '';
if (fs.existsSync(toolsDir)) {
    const tools = fs.readdirSync(toolsDir).filter(t => fs.statSync(path.join(toolsDir, t)).isDirectory());
    if (tools.length > 0) {
        toolsList = '\n\nAvailable tools:\n' + tools.map(t => `  - ${t}`).join('\n');
    }
}

program.name('zero-ops').description('CLI utility for managing named paths (bigbang flow)' + toolsList);

// Register commands
// Extract tool name from arguments if present
// Expected format: zero-ops <tool> <command> ...
// We peek at argv[2]. If it's not a flag or help, we treat it as tool name and remove it.
let toolName = null;
const args = process.argv.slice(2);
if (args.length > 0 && !args[0].startsWith('-') && args[0] !== 'help') {
    toolName = args[0];
    // Remove the tool name from process.argv so Commander doesn't see it
    process.argv.splice(2, 1);
}

if (toolName) {
    const toolModulePath = path.join(__dirname, 'src', 'tools', toolName, 'index.js');
    if (fs.existsSync(toolModulePath)) {
        import(toolModulePath).then(async mod => {
            if (typeof mod.default === 'function') {
                await mod.default(program, toolName);
                program.parse(process.argv);
            } else {
                console.error(`Error: Tool module '${toolName}' does not export a default function.`);
                process.exit(1);
            }
        }).catch(err => {
            console.error(`Failed to load tool '${toolName}': ${err.message}`);
            process.exit(1);
        });
    } else {
        console.error(`Error: Tool '${toolName}' is not installed or recognized.`);
        console.log(`Available tools:`);
        const toolsDir = path.join(__dirname, 'src', 'tools');
        if (fs.existsSync(toolsDir)) {
            fs.readdirSync(toolsDir).forEach(t => {
                if (fs.statSync(path.join(toolsDir, t)).isDirectory()) {
                    console.log(` - ${t}`);
                }
            });
        }
        process.exit(1);
    }
} else {
    // No tool name provided, show help or list available tools
    program.parse(process.argv); // Will likely show help if no args, or error
    if (process.argv.length <= 2) {
        console.log('\nUsage: zero-ops <tool> <command> [options]');
        console.log('\nAvailable tools:');
        const toolsDir = path.join(__dirname, 'src', 'tools');
        if (fs.existsSync(toolsDir)) {
            fs.readdirSync(toolsDir).forEach(t => {
                if (fs.statSync(path.join(toolsDir, t)).isDirectory()) {
                    console.log(` - ${t}`);
                }
            });
        }
    }
}
