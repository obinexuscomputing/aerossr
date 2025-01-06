import { Middleware, StaticFileOptions } from '../types';
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
    /**
     * Serves file content using streams
     */
    private serveStreamedContent;
    /**
     * Serves file content using buffers
     */
    private serveBufferedContent;
    private isCompressible;
    private getMimeType;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map