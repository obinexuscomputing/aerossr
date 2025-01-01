interface ETagOptions {
    weak?: boolean;
}
declare function generateETag(content: string | Buffer, options?: ETagOptions): string;

export { ETagOptions, generateETag };
