/// <reference types="node" />
import { ServerResponse } from 'http';
import { CorsOptionsBase } from '@/types';
export interface CorsOptions extends CorsOptionsBase {
    origins?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}
export declare class CORSManager {
    private readonly defaultOptions;
    constructor(options?: Partial<CorsOptions>);
    /**
     * Validates and normalizes CORS options
     */
    private validateOptions;
    /**
     * Safely joins array values with fallback
     */
    private safeJoin;
    /**
     * Sets CORS headers on response
     */
    setCorsHeaders(res: ServerResponse, options?: Partial<CorsOptions>): void;
    /**
     * Handles preflight requests
     */
    handlePreflight(res: ServerResponse, options?: Partial<CorsOptions>): void;
    /**
     * Normalizes CORS options
     */
    normalizeCorsOptions(options?: string | Partial<CorsOptions>): CorsOptions;
    /**
     * Updates default options
     */
    updateDefaults(options: Partial<CorsOptions>): void;
    /**
     * Gets current default options
     */
    getDefaults(): Required<CorsOptions>;
}
export declare const corsManager: CORSManager;
//# sourceMappingURL=CorsManager.d.ts.map