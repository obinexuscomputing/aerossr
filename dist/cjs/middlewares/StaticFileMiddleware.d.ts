import { IncomingMessage, ServerResponse } from 'http';
import { StaticFileOptions } from '../types';
export declare class StaticFileMiddleware {
    readonly root: string;
    readonly maxAge: number;
    readonly index: string[];
    readonly dotFiles: 'ignore' | 'allow' | 'deny';
    readonly compression: boolean;
    readonly etag: boolean;
    options: any;
    constructor(options: StaticFileOptions);
    private serveFile;
    private isDotFile;
    private handleDotFile;
    private isCompressible;
    private getMimeType;
    private statFile;
    middleware(): (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>;
}
//# sourceMappingURL=StaticFileMiddleware.d.ts.map