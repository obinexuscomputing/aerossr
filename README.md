# AeroSSR

[![npm version](https://badge.fury.io/js/%40obinexuscomputing%2Faerossr.svg)](https://www.npmjs.com/package/@obinexuscomputing/aerossr)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

High-performance server-side rendering framework with built-in bundling and static file serving.

## Features

- 🚀 Fast server-side rendering
- 📦 Built-in JavaScript bundling
- 🗄️ Efficient static file serving
- 🔧 Flexible middleware system
- 🔒 Security-focused design
- 🔍 Detailed logging
- 💾 Intelligent caching
- 🏷️ ETag support

## Installation

```bash
npm install @obinexuscomputing/aerossr
```

## Quick Start

```typescript
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

// Create server instance
const app = new AeroSSR({
  port: 3000,
  compression: true,
  logFilePath: 'logs/server.log'
});

// Add static file middleware
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400
}).middleware());

// Add routes
app.route('/api/hello', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello World!' }));
});

// Start server
app.start().then(() => {
  console.log('Server running on port 3000');
});
```

## Core Features

### Server Configuration

```typescript
const server = new AeroSSR({
  port: 3000,
  cacheMaxAge: 3600,
  corsOrigins: '*',
  compression: true,
  logFilePath: 'logs/server.log'
});
```

### Static File Serving

```typescript
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,
  index: ['index.html'],
  dotFiles: 'ignore',
  compression: true,
  etag: true,
  cacheSize: 100 * 1024 * 1024 // 100MB cache
}).middleware());
```

### Middleware Support

```typescript
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});
```

### Route Handling

```typescript
app.route('/api/users', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ users: [] }));
});
```

### Caching

```typescript
import { createCache } from '@obinexuscomputing/aerossr';

const cache = createCache<string>();
cache.set('key', 'value');
const value = cache.get('key');
```

## API Reference

See [API Documentation](./docs/API.md) for detailed API reference.

## Performance Optimization

- Enable compression for text-based responses
- Use appropriate cache settings for static files
- Implement response caching for frequently accessed data
- Use ETags for client-side caching
- Monitor memory usage with cache size limits

## Security Features

- CORS protection
- XSS prevention
- Path traversal protection
- Dot file access control
- Secure defaults

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import type {
  RouteHandler,
  Middleware,
  StaticFileOptions,
  LoggerOptions
} from '@obinexuscomputing/aerossr';
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT © ObiNexus Computing

## Support

- Documentation: [Full Documentation](./docs)
- Issues: [GitHub Issues](https://github.com/obinexus/aerossr/issues)
- Discussions: [GitHub Discussions](https://github.com/obinexus/aerossr/discussions)