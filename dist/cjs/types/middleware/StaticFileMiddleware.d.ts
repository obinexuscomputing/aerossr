import { StaticFileOptions, Middleware } from '@/types';
export declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    constructor(options: StaticFileOptions);
    private serveFile;
    private isCompressible;
    private getMimeType;
    middleware(): Middleware;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map