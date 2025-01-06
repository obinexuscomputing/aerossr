import { AeroSSRCLI } from '../../src/cli/index.js';

export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}

runCLI();