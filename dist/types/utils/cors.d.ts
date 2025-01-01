import { CorsOptionsBase } from '../types/index.js';
import { ServerResponse } from 'http';

interface CorsOptions {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
interface CorsOptions extends CorsOptionsBase {
}
declare function setCorsHeaders(res: ServerResponse, options?: CorsOptions): void;
declare function normalizeCorsOptions(options: string | CorsOptions | undefined): CorsOptions;

export { CorsOptions, normalizeCorsOptions, setCorsHeaders };
