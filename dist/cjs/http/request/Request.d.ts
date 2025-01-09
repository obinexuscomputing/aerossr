/// <reference types="node" />
import { IncomingMessage } from 'http';
import { ParsedUrlQuery } from 'querystring';
export declare class Request {
    readonly raw: IncomingMessage;
    readonly params: Record<string, string>;
    readonly query: ParsedUrlQuery;
    readonly path: string;
    readonly method: string;
    body: any;
    constructor(req: IncomingMessage, params?: Record<string, string>);
    header(name: string): string | string[] | undefined;
    get headers(): Record<string, string | string[] | undefined>;
    accepts(type: string): boolean;
}
//# sourceMappingURL=Request.d.ts.map