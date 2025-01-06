import { MiddlewareConfig } from './commands';
import { Logger } from '../utils/logger';
export interface AeroConfig {
    port: number;
    logPath: string;
    middleware: MiddlewareConfig[];
    [key: string]: unknown;
}
export declare class AeroSSRCLI {
    private static readonly CONFIG_FILE;
    private static readonly DEFAULT_CONFIG;
    private readonly program;
    private readonly logger;
    constructor(logger?: Logger);
    /**
     * Find configuration file in directory hierarchy
     */
    private findConfigFile;
    /**
     * Load configuration from file or return defaults
     */
    private loadConfig;
    /**
     * Save configuration to file
     */
    private saveConfig;
    /**
     * Setup CLI program and commands
     */
    private setupProgram;
    /**
     * Parse command line arguments and execute
     */
    run(args?: string[]): Promise<void>;
}
export declare const cli: AeroSSRCLI;
export default function runCLI(): Promise<void>;
//# sourceMappingURL=index.d.ts.map