const { AeroSSRCLI } = require('../dist/cli/index.js');
export const cli = new AeroSSRCLI();

export function runCLI(){
    return cli.run();
}
runCLI();