/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { ServerResponse } from 'http';
export declare class Response {
    readonly raw: ServerResponse;
    private headersSent;
    constructor(res: ServerResponse);
    status(code: number): this;
    header(name: string, value: string): this;
    type(type: string): this;
    send(body: any): void;
    json(body: any): void;
    end(data?: string | Buffer): void;
}
//# sourceMappingURL=Response.d.ts.map