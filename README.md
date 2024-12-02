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

## Usage

### TypeScript

```typescript
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const app = new AeroSSR({
  port: 3000,
  compression: true,
  logFilePath: 'logs/server.log'
});

app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400
}).middleware());

app.route('/api/hello', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Hello World!' }));
});

app.start().then(() => console.log('Server running on port 3000'));
```

### JavaScript

```javascript
const { AeroSSR, StaticFileMiddleware } = require('@obinexuscomputing/aerossr');

const app = new AeroSSR({
  port: 3000,
  compression: true
});

app.use(new StaticFileMiddleware({
  root: 'public'
}).middleware());

app.use(async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  await next();
});

app.route('/api/data', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
});

app.start();
```

## Core Features

### Server Configuration

```typescript
const app = new AeroSSR({
  port: 3000,
  cacheMaxAge: 3600,
  corsOrigins: '*',
  compression: true,
  logFilePath: 'logs/server.log'
});
```

### Static Files

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

### Middleware

```typescript
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});
```

### Caching

```typescript
import { createCache } from '@obinexuscomputing/aerossr';

const cache = createCache<string>();
cache.set('key', 'value');
const value = cache.get('key');
```

## Security Features

- CORS protection with configurable origins
- XSS prevention through automatic escaping
- Path traversal protection
- Configurable dot file access control
- Secure defaults

## Performance Features

- Compression for text-based responses
- Configurable cache settings for static files
- Response caching system
- ETag support for client-side caching
- Memory usage monitoring

## TypeScript Support

```typescript
import type {
  RouteHandler,
  Middleware,
  StaticFileOptions,
  LoggerOptions
} from '@obinexuscomputing/aerossr';
```

## Roadmap

### Current Development
- Hot Module Replacement (HMR)
- React server components
- WebSocket support
- HTTP/2 implementation
- Database integrations
- GraphQL middleware

### Future Features
- Authentication middleware
- Rate limiting
- Request validation
- API documentation generator
- Project scaffolding CLI
- Plugin system
- Analytics
- Service workers

### Performance
- Bundling optimization
- Memory management
- Response streaming
- Distributed caching
- Image optimization

### Developer Experience
- Enhanced error reporting
- Development tools
- Framework integrations
- Zero-config deployment
- Testing utilities

## Documentation & Support

- [API Documentation](./docs/API.md)
- [GitHub Issues](https://github.com/obinexus/aerossr/issues)
- [GitHub Discussions](https://github.com/obinexus/aerossr/discussions)

## License

MIT © ObiNexus Computing