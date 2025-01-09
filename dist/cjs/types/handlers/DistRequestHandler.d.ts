import { Request, Response } from '../http';
import { AeroSSRConfig } from '@/types';
import { Logger } from '@/utils/logging';
import { AeroSSRBundler } from '@/core/bundler';
export declare class DistRequestHandler {
    private readonly bundler;
    private readonly config;
    private readonly logger;
    constructor(bundler: AeroSSRBundler, config: Required<AeroSSRConfig>, logger: Logger);
    /**
     * Handle distribution request for bundled JavaScript
     */
    handleDistRequest(req: Request, res: Response): Promise<void>;
    /**
     * Get entry point from request query
     */
    private getEntryPoint;
    /**
     * Generate bundle with options
     */
    private generateBundle;
    /**
     * Generate ETag for content
     */
    private generateETag;
    /**
     * Check if content is not modified
     */
    private isNotModified;
    /**
     * Send 304 Not Modified response
     */
    private sendNotModified;
    /**
     * Create response headers
     */
    private createHeaders;
    /**
     * Send response with optional compression
     */
    private sendResponse;
    /**
     * Check if response should be compressed
     */
    private shouldCompress;
    /**
     * Send compressed response
     */
    private sendCompressed;
    /**
     * Send uncompressed response
     */
    private sendUncompressed;
    /**
     * Handle errors
     */
    private handleError;
    /**
     * Send error response
     */
    private sendErrorResponse;
}
//# sourceMappingURL=DistRequestHandler.d.ts.map