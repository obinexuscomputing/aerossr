import { IncomingMessage, Server, ServerResponse } from 'http';
import { AeroSSRConfig, StaticFileOptions, LoggerOptions, CacheStore, MetaTags } from './@types';

export type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse
) => Promise<void> | void;

export type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
) => Promise<void>;

declare namespace AeroSSR {
    class Core {
        constructor(config?: AeroSSRConfig);
        start(): Promise<Server>;
        stop(): Promise<void>;
        use(middleware: Middleware): void;
        route(path: string, handler: RouteHandler): void;
        readonly config: Required<AeroSSRConfig>;
    }

    namespace Middleware {
        class StaticFile {
            constructor(options: StaticFileOptions);
            middleware(): Middleware;
        }
    }

    namespace Utils {
        class Logger {
            constructor(options?: LoggerOptions);
            log(message: string): void;
            logRequest(req: IncomingMessage): void;
        }

        namespace Cache {
            function create<T>(): CacheStore<T>;
        }

        namespace HTTP {
            function setCorsHeaders(res: ServerResponse, origins?: string): void;
            function generateETag(content: string | Buffer): string;
        }

        namespace Error {
            function generatePage(statusCode: number, message: string): string;
            function handle(
                error: Error & { statusCode?: number },
                req: IncomingMessage,
                res: ServerResponse
            ): Promise<void>;
        }

        namespace HTML {
            function injectMetaTags(
                html: string,
                meta?: MetaTags,
                defaultMeta?: MetaTags
            ): string;
        }

        namespace Bundle {
            function generate(projectPath: string, entryPoint: string): Promise<string>;
        }
    }
}
export { AeroSSR } from './AeroSSR'
export default AeroSSR.Core; 