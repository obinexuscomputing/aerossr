import { generateETag } from '../../src/utils/etag';

describe('ETag Generator', () => {
  it('should generate a strong ETag by default', () => {
    const content = 'test content';
    const etag = generateETag(content);
    expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it('should generate a weak ETag when specified', () => {
    const content = 'test content';
    const etag = generateETag(content, { weak: true });
    expect(etag).toMatch(/^W\/"[a-f0-9]{32}"$/);
  });
});
