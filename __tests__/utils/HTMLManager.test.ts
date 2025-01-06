// __tests__/utils/HTMLManager.test.ts
import { HTMLManager } from '../../src/utils/HTMLManager';

describe('HTMLManager', () => {
  let htmlManager: HTMLManager;
  const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';

  beforeEach(() => {
    htmlManager = new HTMLManager();
  });

  describe('Default Meta Tags', () => {
    it('should initialize with default meta tags', () => {
      const defaultMeta = htmlManager.getDefaultMeta();
      expect(defaultMeta.charset).toBe('utf-8');
      expect(defaultMeta.viewport).toBe('width=device-width, initial-scale=1.0');
    });

    it('should update default meta tags', () => {
      const newDefaults = {
        title: 'Default Title',
        description: 'Default Description'
      };
      htmlManager.setDefaultMeta(newDefaults);
      const updatedMeta = htmlManager.getDefaultMeta();
      expect(updatedMeta.title).toBe('Default Title');
      expect(updatedMeta.description).toBe('Default Description');
    });
  });

  describe('Meta Tags Injection', () => {
    it('should inject basic meta tags', () => {
      const meta = {
        title: 'Test Page',
        description: 'Test Description'
      };
      const result = htmlManager.injectMetaTags(baseHtml, meta);
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<meta name="description" content="Test Description">');
    });

    it('should handle OpenGraph tags', () => {
      const meta = {
        ogTitle: 'OG Title',
        ogDescription: 'OG Description',
        ogImage: 'https://example.com/image.jpg'
      };
      const result = htmlManager.injectMetaTags(baseHtml, meta);
      expect(result).toContain('<meta property="og:title" content="OG Title">');
      expect(result).toContain('<meta property="og:description" content="OG Description">');
      expect(result).toContain('<meta property="og:image" content="https://example.com/image.jpg">');
    });

    it('should handle Twitter tags', () => {
      const meta = {
        twitterCard: 'summary_large_image',
        twitterTitle: 'Twitter Title',
        twitterDescription: 'Twitter Description'
      };
      const result = htmlManager.injectMetaTags(baseHtml, meta);
      expect(result).toContain('<meta name="twitter:card" content="summary_large_image">');
      expect(result).toContain('<meta name="twitter:title" content="Twitter Title">');
      expect(result).toContain('<meta name="twitter:description" content="Twitter Description">');
    });

    it('should merge with default meta tags', () => {
      htmlManager.setDefaultMeta({ author: 'Default Author' });
      const meta = { title: 'Custom Title' };
      const result = htmlManager.injectMetaTags(baseHtml, meta);
      expect(result).toContain('<meta name="author" content="Default Author">');
      expect(result).toContain('<title>Custom Title</title>');
    });
  });

  describe('Meta Tags Validation', () => {
    it('should validate title length', () => {
      const validMeta = { title: 'Short Title' };
      const invalidMeta = { title: 'a'.repeat(61) };
      
      expect(htmlManager.validateMetaTags(validMeta)).toBeTruthy();
      expect(htmlManager.validateMetaTags(invalidMeta)).toBeFalsy();
    });

    it('should validate description length', () => {
      const validMeta = { description: 'Short description' };
      const invalidMeta = { description: 'a'.repeat(161) };
      
      expect(htmlManager.validateMetaTags(validMeta)).toBeTruthy();
      expect(htmlManager.validateMetaTags(invalidMeta)).toBeFalsy();
    });

    it('should validate image URLs', () => {
      const validMeta = { ogImage: 'https://example.com/image.jpg' };
      const invalidMeta = { ogImage: 'invalid-url' };
      
      expect(htmlManager.validateMetaTags(validMeta)).toBeTruthy();
      expect(htmlManager.validateMetaTags(invalidMeta)).toBeFalsy();
    });
  });

  describe('Content Sanitization', () => {
    it('should create sanitized meta tags', () => {
      const meta = {
        title: '<script>alert("xss")</script>Title',
        description: 'Description with "quotes"'
      };
      const sanitized = htmlManager.createMetaTags(meta);
      
      expect(sanitized.title).toBe('alert("xss")Title');
      expect(sanitized.description).toBe('Description with &quot;quotes&quot;');
    });
  });

  describe('HTML Generation', () => {
    it('should generate complete HTML document', () => {
      const content = '<div>Test Content</div>';
      const meta = { title: 'Test Title' };
      const result = htmlManager.generateHTML(content, meta);
      
      expect(result).toContain(content);
      expect(result).toContain('<title>Test Title</title>');
      expect(result).toContain('<!DOCTYPE html>');
    });
  });

  describe('Meta Tags Extraction', () => {
    it('should extract existing meta tags', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Existing Title</title>
          <meta name="description" content="Existing Description">
          <meta property="og:title" content="OG Title">
        </head>
        <body></body>
        </html>
      `;
      
      const extracted = htmlManager.extractMetaTags(html);
      expect(extracted.title).toBe('Existing Title');
      expect(extracted.description).toBe('Existing Description');
      expect(extracted.ogTitle).toBe('OG Title');
    });
  });
});