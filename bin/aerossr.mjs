import { AeroSSRCLI } from '../../src/cli/index.mjs';

export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}

runCLI();