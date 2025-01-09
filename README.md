

# AeroSSR
## Computing from the heart

[![npm version](https://badge.fury.io/js/@obinexuscomputing%2Faerossr.svg)](https://www.npmjs.com/package/@obinexuscomputing/aerossr)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A high-performance, TypeScript-first server-side rendering (SSR) and bundling framework for Node.js applications.

## Key Features

- 🚀 High-performance SSR with built-in bundling
- 📦 Advanced module bundling with dependency resolution
- 🔒 Built-in security middleware and headers
- 🌐 Configurable CORS and static file serving
- 📝 Comprehensive TypeScript support
- 🛠️ CLI tools for project management
- 📊 Built-in logging and monitoring
- 💾 Intelligent caching system

## Installation

```bash
npm install @obinexuscomputing/aerossr
```

## Quick Start

```typescript
import { AeroSSR } from '@obinexuscomputing/aerossr';

const app = new AeroSSR({
  port: 3000,
  compression: true,
  logFilePath: 'logs/server.log'
});

// Add middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  app.logger.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});

// Define routes
app.route('/', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Welcome to AeroSSR!</h1>');
});

// Start server
await app.start();
```

## CLI Usage

Initialize a new project:

```bash
npx @obinexuscomputing/aerossr init
```

Add middleware:

```bash
npx @obinexuscomputing/aerossr middleware \
  --name auth \
  --path ./middleware/auth.js
```

Update configuration:

```bash
npx @obinexuscomputing/aerossr config \
  --update port=4000
```

## Core Features

### Bundling System
```typescript
import { AeroSSRBundler } from '@obinexuscomputing/aerossr';

const bundler = new AeroSSRBundler('./src');
const bundle = await bundler.generateBundle('main.ts', {
  minify: true,
  target: 'browser'
});
```

### Security Middleware
```typescript
import { SecurityMiddleware } from '@obinexuscomputing/aerossr';

app.use(SecurityMiddleware.csrfProtection);
app.use(SecurityMiddleware.rateLimit(100, 60000));
app.use(SecurityMiddleware.securityHeaders);
```

### Cookie Management
```typescript
import { cookieManager } from '@obinexuscomputing/aerossr';

app.use(async (req, res, next) => {
  cookieManager.setCookie('session', 'value', 1, {
    secure: true,
    sameSite: 'Strict'
  });
  await next();
});
```

### Static File Handling
```typescript
import { StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const staticFiles = new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,
  index: ['index.html'],
  compression: true,
  etag: true
});

app.use(staticFiles.middleware());
```

### Advanced Logging
```typescript
import { Logger } from '@obinexuscomputing/aerossr';

const logger = new Logger({
  logFilePath: 'logs/app.log',
  logLevel: 'info',
  format: 'json'
});

logger.log('Server started');
```

## Configuration Options

```typescript
const app = new AeroSSR({
  port: 3000,
  compression: true,
  logFilePath: 'logs/server.log',
  corsOrigins: '*',
  cacheMaxAge: 3600,
  defaultMeta: {
    title: 'My App',
    description: 'Built with AeroSSR'
  }
});
```

## TypeScript Support

Comprehensive type definitions for all features:

```typescript
import type {
  AeroSSRConfig,
  Middleware,
  RouteHandler,
  CacheOptions,
  BundleOptions
} from '@obinexuscomputing/aerossr';
```

## Project Structure
```
my-project/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── main.ts
│   └── components/
├── logs/
└── aerossr.config.json
```

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api.md)
- [Security Guide](./docs/security.md)
- [Contributing](./CONTRIBUTING.md)

## Support

- Report issues: [GitHub Issues](https://github.com/obinexuscomputing/aerossr/issues)
- Get help: [Discord Community](https://discord.gg/obinexuscomputing)
- Support development: [Buy Me a Coffee](https://buymeacoffee.com/obinexuscomputing)

## License

ISC © [OBINexus Computing](https://github.com/obinexuscomputing)