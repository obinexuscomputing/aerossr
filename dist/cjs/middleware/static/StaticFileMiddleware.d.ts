import type { Middleware, StaticFileOptions } from '../../types/';
export declare class StaticFileMiddleware {
    private readonly root;
    private readonly maxAge;
    private readonly index;
    private readonly dotFiles;
    private readonly compression;
    private readonly etag;
    private readonly headers;
    constructor(options: StaticFileOptions);
    private isDotFile;
    private isCompressible;
    private getMimeType;
    private handleFile;
    private serveFile;
    middleware(): Middleware;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map