#!/usr/bin/env node
// Purpose: Entry point for the AeroSSR CLI.
// Project: AeroSSR
import { AeroSSRCLI } from '../../dist/cli/bin/index.mjs';

export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}

runCLI();