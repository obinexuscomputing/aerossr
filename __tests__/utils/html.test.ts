import { injectMetaTags } from '../../src/utils/html';

describe('HTML Meta Tags Injection', () => {
  const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';

  it('should inject basic meta tags', () => {
    const meta = {
      title: 'Test Page',
      description: 'Test Description'
    };
    const result = injectMetaTags(baseHtml, meta);
    expect(result).toContain('<title>Test Page</title>');
    expect(result).toContain('<meta name="description" content="Test Description">');
  });

  it('should handle OpenGraph tags', () => {
    const meta = {
      ogTitle: 'OG Title',
      ogDescription: 'OG Description'
    };
    const result = injectMetaTags(baseHtml, meta);
    expect(result).toContain('<meta property="og:title" content="OG Title">');
    expect(result).toContain('<meta property="og:description" content="OG Description">');
  });
});
