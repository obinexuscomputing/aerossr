/// <reference types="node" />
/// <reference types="node" />
export interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}
export declare function generateETag(content: string | Buffer): string;
//# sourceMappingURL=etag.d.ts.map