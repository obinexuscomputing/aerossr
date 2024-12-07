# AeroSSR

AeroSSR is a lightweight, flexible server-side rendering framework for Node.js applications. It provides built-in support for static file serving, middleware, routing, caching, and compression.

## Features

- Fast and efficient server-side rendering
- Built-in static file serving with caching and compression
- Flexible middleware system
- TypeScript support with full type definitions
- Customizable routing
- CORS handling
- Error management
- Extensible logging
- Cache management
- ETag support

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

## Configuration

The `AeroSSR` constructor accepts the following configuration options:

```typescript
interface AeroSSRConfig {
  port?: number;              // Default: 3000
  cacheMaxAge?: number;       // Default: 3600
  corsOrigins?: string;       // Default: '*'
  compression?: boolean;      // Default: true
  logFilePath?: string;       // Default: null
  bundleCache?: CacheStore<string>;
  templateCache?: CacheStore<string>;
  defaultMeta?: {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
  };
}
```

## Static File Serving

The `StaticFileMiddleware` provides robust static file serving capabilities:

```typescript
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,              // 1 day cache
  index: ['index.html'],      // Default files
  dotFiles: 'ignore',         // Handle dot files
  compression: true,          // Enable compression
  etag: true                  // Enable ETags
}).middleware());
```

## Middleware Support

AeroSSR supports middleware for request processing:

```typescript
// Logging middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});

// Error handling middleware
app.use(async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});
```

## Routing

Define routes with support for async handlers:

```typescript
app.route('/api/users', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ users: [] }));
});
```

## Caching

Implement caching strategies using the built-in cache store:

```typescript
import { createCache } from '@obinexuscomputing/aerossr';

const cache = createCache<string>();
cache.set('key', 'value');
const value = cache.get('key');
```

## Error Handling

Custom error pages and error handling:

```typescript
import { generateErrorPage } from '@obinexuscomputing/aerossr';

app.use(async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    const errorPage = generateErrorPage(500, error.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(errorPage);
  }
});
```

## Logging

Configure custom logging:

```typescript
import { Logger } from '@obinexuscomputing/aerossr';

const logger = new Logger({
  logFilePath: 'logs/custom.log'
});
```

## Best Practices

1. Add middleware in the correct order - logging first, then authentication, then route handlers
2. Implement error handling middleware to catch and process errors
3. Use caching for static files and frequently accessed data
4. Enable compression for text-based responses
5. Implement proper security middleware for authentication
6. Use the built-in logger for debugging and monitoring

## TypeScript Support

AeroSSR is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  RouteHandler,
  Middleware,
  StaticFileOptions,
  LoggerOptions
} from '@obinexuscomputing/aerossr';
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to AeroSSR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.