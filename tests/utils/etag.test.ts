import { generateETag } from '../../utils/etag';

describe('ETag Generator', () => {
  test('should generate consistent ETags for same content', () => {
    const testContent = 'test content';
    const etag1 = generateETag(testContent);
    const etag2 = generateETag(testContent);
    expect(etag1).toBe(etag2);
  });

  test('should generate different ETags for different content', () => {
    const etag1 = generateETag('content1');
    const etag2 = generateETag('content2');
    expect(etag1).not.toBe(etag2);
  });

  test('should handle Buffer input', () => {
    const testBuffer = Buffer.from('test content');
    const etag = generateETag(testBuffer);
    expect(typeof etag).toBe('string');
    expect(etag.length).toBeGreaterThan(0);
  });
});