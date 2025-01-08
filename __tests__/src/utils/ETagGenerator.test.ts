// __tests__/utils/ETagGenerator.test.ts
import { ETagGenerator } from '../../src/utils/ETagGenerator';

describe('ETagGenerator', () => {
  let generator: ETagGenerator;

  beforeEach(() => {
    generator = new ETagGenerator();
  });

  describe('Basic ETag Generation', () => {
    it('should generate a strong ETag by default', () => {
      const content = 'test content';
      const etag = generator.generate(content);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should generate a weak ETag when specified', () => {
      const content = 'test content';
      const etag = generator.generate(content, { weak: true });
      expect(etag).toMatch(/^W\/"[a-f0-9]{32}"$/);
    });

    it('should handle Buffer input', () => {
      const content = Buffer.from('test content');
      const etag = generator.generate(content);
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = generator.generate('content1');
      const etag2 = generator.generate('content2');
      expect(etag1).not.toBe(etag2);
    });
  });

  describe('Hashing Options', () => {
    it('should support different hashing algorithms', () => {
      const content = 'test content';
      const md5Etag = generator.generate(content, { algorithm: 'md5' });
      const sha1Etag = generator.generate(content, { algorithm: 'sha1' });
      const sha256Etag = generator.generate(content, { algorithm: 'sha256' });

      expect(md5Etag).not.toBe(sha1Etag);
      expect(sha1Etag).not.toBe(sha256Etag);
    });

    it('should support different encodings', () => {
      const content = 'test content';
      const hexEtag = generator.generate(content, { encoding: 'hex' });
      const base64Etag = generator.generate(content, { encoding: 'base64' });

      expect(hexEtag).not.toBe(base64Etag);
    });
  });

  describe('Caching', () => {
    it('should cache generated ETags', () => {
      const content = 'test content';
      const firstEtag = generator.generate(content);
      const secondEtag = generator.generate(content);
      
      expect(firstEtag).toBe(secondEtag);
      expect(generator.getCacheStats().size).toBe(1);
    });

    it('should respect max cache size', () => {
      const generator = new ETagGenerator({}, 2);
      
      generator.generate('content1');
      generator.generate('content2');
      generator.generate('content3');

      const stats = generator.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(2);
    });

    it('should clear cache when requested', () => {
      generator.generate('test content');
      expect(generator.getCacheStats().size).toBe(1);

      generator.clearCache();
      expect(generator.getCacheStats().size).toBe(0);
    });
  });

  describe('ETag Validation', () => {
    it('should validate strong ETags', () => {
      expect(generator.isValid('"123abc"')).toBeTruthy();
      expect(generator.isValid('"invalid')).toBeFalsy();
    });

    it('should validate weak ETags', () => {
      expect(generator.isValid('W/"123abc"')).toBeTruthy();
      expect(generator.isValid('W/invalid')).toBeFalsy();
    });
  });

  describe('ETag Comparison', () => {
    it('should compare ETags correctly', () => {
      const etag1 = '"123abc"';
      const etag2 = 'W/"123abc"';
      const etag3 = '"456def"';

      expect(generator.compare(etag1, etag2)).toBeTruthy();
      expect(generator.compare(etag1, etag3)).toBeFalsy();
    });
  });

  describe('Configuration', () => {
    it('should allow updating default options', () => {
      generator.setDefaultOptions({ weak: true });
      const etag = generator.generate('test content');
      expect(etag).toMatch(/^W\/"[a-f0-9]{32}"$/);
    });

    it('should allow updating max cache size', () => {
      generator.setMaxCacheSize(1);
      generator.generate('content1');
      generator.generate('content2');

      const stats = generator.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(1);
    });

    it('should get current default options', () => {
      const options = generator.getDefaultOptions();
      expect(options).toHaveProperty('weak', false);
      expect(options).toHaveProperty('algorithm', 'md5');
      expect(options).toHaveProperty('encoding', 'hex');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const etag = generator.generate('');
      expect(generator.isValid(etag)).toBeTruthy();
    });

    it('should handle special characters in content', () => {
      const etag = generator.generate('!@#$%^&*()');
      expect(generator.isValid(etag)).toBeTruthy();
    });

    it('should handle very large content', () => {
      const largeContent = 'x'.repeat(1000000);
      const etag = generator.generate(largeContent);
      expect(generator.isValid(etag)).toBeTruthy();
    });
  });
});