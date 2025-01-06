import { Middleware } from '../types';
export interface StaticFileOptions {
    root: string;
    maxAge?: number;
    index?: string[];
    dotFiles?: 'ignore' | 'allow' | 'deny';
    compression?: boolean;
    etag?: boolean;
}
export declare class StaticFileMiddleware {
    private readonly root;
    private readonly maxAge;
    private readonly index;
    private readonly dotFiles;
    private readonly compression;
    private readonly etag;
    constructor(options: StaticFileOptions);
    private handleFile;
    middleware(): Middleware;
    private isDotFile;
    private serveFile;
    private isCompressible;
    private getMimeType;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map