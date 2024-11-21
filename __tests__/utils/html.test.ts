

describe('HTML Utilities', () => {
  test('should inject meta tags into HTML', () => {
    const html = '<html><head></head><body></body></html>';
    const meta = {
      title: 'Test Title',
      description: 'Test Description',
    };
    const result = injectMetaTags(html, meta);
    
    expect(result).toContain('<title>Test Title</title>');
    expect(result).toContain('<meta name="description" content="Test Description">');
  });

  test('should merge with default meta tags', () => {
    const html = '<html><head></head><body></body></html>';
    const meta = { title: 'Custom Title' };
    const defaultMeta = {
      charset: 'UTF-8',
      viewport: 'width=device-width, initial-scale=1.0',
    };
    
    const result = injectMetaTags(html, meta, defaultMeta);
    
    expect(result).toContain('<title>Custom Title</title>');
    expect(result).toContain('<meta charset="UTF-8">');
    expect(result).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    );
  });

  test('should handle missing meta tags', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectMetaTags(html);
    expect(result).toContain('</head>');
  });

  test('should escape special characters in meta content', () => {
    const html = '<html><head></head><body></body></html>';
    const meta = {
      title: '<script>alert("xss")</script>',
      description: '&<>"\'',
    };
    
    const result = injectMetaTags(html, meta);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

function injectMetaTags(html: string, meta: { title: string; }, defaultMeta: { charset: string; viewport: string; }, meta: { title: string; description: string; }) {
    throw new Error("Function not implemented.");
}

