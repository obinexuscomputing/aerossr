import { injectMetaTags } from '../utils/html';

describe('HTML Meta Tags Injection', () => {
  const baseHtml = '<html><head></head><body></body></html>';

  test('should inject basic meta tags', () => {
    const meta = {
      title: 'Test Title',
      description: 'Test Description'
    };
    const result = injectMetaTags(baseHtml, meta);
    expect(result).toContain('<title>Test Title</title>');
    expect(result).toContain('content="Test Description"');
  });

  test('should use default meta tags when no meta provided', () => {
    const defaultMeta = {
      title: 'Default Title',
      description: 'Default Description'
    };
    const result = injectMetaTags(baseHtml, {}, defaultMeta);
    expect(result).toContain('<title>Default Title</title>');
    expect(result).toContain('content="Default Description"');
  });

  test('should override default meta tags with provided meta', () => {
    const meta = {
      title: 'Custom Title'
    };
    const defaultMeta = {
      title: 'Default Title',
      description: 'Default Description'
    };
    const result = injectMetaTags(baseHtml, meta, defaultMeta);
    expect(result).toContain('<title>Custom Title</title>');
    expect(result).toContain('content="Default Description"');
  });
});