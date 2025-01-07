#!/usr/bin/env node
// Purpose: Entry point for the AeroSSR CLI.
// Project: AeroSSR
const { AeroSSRCLI } = require('../../dist/cli/index.cjs');
export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}
runCLI();