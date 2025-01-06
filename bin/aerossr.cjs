const { AeroSSRCLI } = require('../dist/cli/index.cjs');
export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}
runCLI();