import { StaticFileOptions, Middleware } from '../types';
export declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    constructor(options: StaticFileOptions);
    private isDotFile;
    private handleDotFile;
    private isCompressible;
    private getMimeType;
    private serveFile;
    middleware(): Middleware;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map