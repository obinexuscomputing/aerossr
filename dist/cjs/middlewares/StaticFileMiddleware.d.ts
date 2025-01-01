import { IncomingMessage, ServerResponse } from 'http';
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
    private isDotFile;
    private handleDotFile;
    private isCompressible;
    private getMimeType;
    private serveFile;
    middleware(): (req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map