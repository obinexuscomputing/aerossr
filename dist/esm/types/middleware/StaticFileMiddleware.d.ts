/// <reference types="node" />
/// <reference types="node" />
import { StaticFileOptions, Middleware } from '../types';
export interface CachedContent {
    content: Buffer;
    headers: Record<string, string>;
    encoding?: string;
}
export declare class StaticFileMiddleware {
    private readonly root;
    private readonly maxAge;
    private readonly index;
    private readonly dotFiles;
    private readonly compression;
    private readonly etag;
    constructor(options: StaticFileOptions);
    private serveFile;
    private isCompressible;
    private getMimeType;
    middleware(): Middleware;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map