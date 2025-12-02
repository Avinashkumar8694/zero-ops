// src/tools/bigbang/index.js
// Entry point for the bigbang tool
import registerConfig from '../../common/config.js';
import registerDelete from './delete.js';

export default function (program, toolName) {
    // Register shared config commands
    registerConfig(program, toolName);

    // Register bigbang-specific delete commands
    registerDelete(program, toolName);

    // Add top-level examples for the tool
    program.addHelpText('after', `
Examples:
  Configure a path:
    $ zero-ops ${toolName} config set projectA ./data/projectA --active

  List configurations:
    $ zero-ops ${toolName} config list

  Delete data in a configured path:
    $ zero-ops ${toolName} delete projectA

  Delete data in all active paths:
    $ zero-ops ${toolName} delete-active
`);
}
