#!/usr/bin/env node
// Purpose: Entry point for the AeroSSR CLI.
// Project: AeroSSR
const { AeroSSRCLI } = require('../../dist/cjs/cli');
export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}
runCLI();