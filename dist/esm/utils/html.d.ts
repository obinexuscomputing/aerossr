export interface MetaTags {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    keywords?: string;
    author?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    [key: string]: string | undefined;
}
export declare function injectMetaTags(html: string, meta?: MetaTags, defaultMeta?: MetaTags): string;
//# sourceMappingURL=html.d.ts.map