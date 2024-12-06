export interface MetaTags {
    charset?: string;
    viewport?: string;
    description?: string;
    title?: string;
    [key: string]: string | undefined;
}
export declare function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;
//# sourceMappingURL=html.d.ts.map