/// <reference types="node" />
import { CorsOptionsBase } from '@/types';
import { ServerResponse } from 'http';
export interface CorsOptions {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
export interface CorsOptions extends CorsOptionsBase {
}
export declare function setCorsHeaders(res: ServerResponse, options?: CorsOptions): void;
export declare function normalizeCorsOptions(options: string | CorsOptions | undefined): CorsOptions;
//# sourceMappingURL=cors.d.ts.map