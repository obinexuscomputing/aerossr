# AeroSSR

[![npm version](https://badge.fury.io/js/@obinexuscomputing%2Faerossr.svg)](https://www.npmjs.com/package/@obinexuscomputing/aerossr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, TypeScript-first server-side rendering (SSR) framework for Node.js applications.

## Key Features

- 🚀 High-performance SSR with caching and compression
- 📁 Advanced static file serving with ETag support
- 🔌 Flexible middleware system with async/await
- 🔒 Built-in security features (CORS, rate limiting)
- 📝 Comprehensive TypeScript definitions
- 🛠️ CLI tools for project setup and management
- 📊 Built-in logging and monitoring
- 💾 Configurable caching strategies

## Installation

```bash
# Using npm
npm install @obinexuscomputing/aerossr

# Using yarn
yarn add @obinexuscomputing/aerossr

# Using pnpm
pnpm add @obinexuscomputing/aerossr
```

## Quick Start

```typescript
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const app = new AeroSSR({
  port: 3000,
  compression: true,
  logFilePath: 'logs/server.log'
});

// Static files
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,
  compression: true
}).middleware());

// API routes
app.route('/api/data', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'success' }));
});

await app.start();
```

## CLI Usage

```bash
# Initialize new project
npx aerossr init -d ./my-project

# Add middleware
npx aerossr middleware -n auth -p ./middleware/auth.js

# Configure settings
npx aerossr config -u port=4000
```

## Advanced Features

### Middleware System
```typescript
// Custom middleware
app.use(async (req, res, next) => {
  const start = performance.now();
  await next();
  console.log(`${req.method} ${req.url} - ${performance.now() - start}ms`);
});
```

### Security Features
```typescript
import { SecurityMiddleware } from '@obinexuscomputing/aerossr';

app.use(SecurityMiddleware.csrfProtection);
app.use(SecurityMiddleware.rateLimit(100, 60000)); // 100 requests per minute
```

### Caching Strategies
```typescript
import { createCache } from '@obinexuscomputing/aerossr';

const cache = createCache<string>();
app.use(async (req, res, next) => {
  const key = req.url;
  const cached = cache.get(key);
  if (cached) return res.end(cached);
  await next();
});
```

### Static File Configuration
```typescript
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,
  index: ['index.html'],
  dotFiles: 'ignore',
  compression: true,
  etag: true
}).middleware());
```

## Performance Optimization

- Built-in gzip compression
- Automatic ETag generation
- Configurable caching headers
- Static file optimization
- Memory-efficient streaming

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  RouteHandler,
  Middleware,
  StaticFileOptions,
  LoggerOptions,
  CacheStore
} from '@obinexuscomputing/aerossr';
```

## Documentation

- [API Reference](./docs/API.md)
- [Configuration Guide](./docs/CONFIG.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Support

- [GitHub Issues](https://github.com/obinexuscomputing/aerossr/issues)
- [GitLab Issues](https://gitlab.com/obinexuscomputing/aerossr/issues)
- [Buy Me a Coffee](https://buymeacoffee.com/obinexuscomputing)
- [Discord Community](https://discord.gg/obinexuscomputing)

## License

MIT © [OBINexus Computing](https://github.com/obinexuscomputing)