# AeroSSR Usage Guide

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

## Common Use Cases

### 1. Serving Static Files

```typescript
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const app = new AeroSSR();

// Basic static file serving
app.use(new StaticFileMiddleware({
  root: 'public'
}).middleware());

// Advanced configuration
app.use(new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,              // 1 day cache
  index: ['index.html'],      // Default files
  dotFiles: 'ignore',         // Handle dot files
  compression: true,          // Enable compression
  etag: true,                 // Enable ETags
  cacheSize: 100 * 1024 * 1024 // 100MB cache
}).middleware());
```

### 2. Adding Middleware

```typescript
// Logging middleware
app.use(async (req, res, next) => {
  const start = Date.now();
  await next();
  console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});

// Authentication middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }
  await next();
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

### 3. Route Handlers

```typescript
// Basic route
app.route('/api/users', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ users: [] }));
});

// Route with parameters
app.route('/api/users/:id', async (req, res) => {
  const id = req.url.split('/').pop();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ id }));
});
```

### 4. Handling CORS

```typescript
// Global CORS configuration
const app = new AeroSSR({
  corsOrigins: 'http://example.com'
});

// Per-route CORS
import { setCorsHeaders } from '@obinexuscomputing/aerossr';

app.route('/api/data', async (req, res) => {
  setCorsHeaders(res, 'http://example.com');
  res.writeHead(200);
  res.end('Data');
});
```

### 5. Caching Strategies

```typescript
import { createCache } from '@obinexuscomputing/aerossr';

// Create a cache for responses
const responseCache = createCache<string>();

app.route('/api/cached', async (req, res) => {
  const cacheKey = req.url;
  const cached = responseCache.get(cacheKey);
  
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(cached);
    return;
  }
  
  const data = JSON.stringify({ timestamp: Date.now() });
  responseCache.set(cacheKey, data);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(data);
});
```

### 6. Error Handling

```typescript
// Global error handler
app.use(async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    if (error.statusCode === 404) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

// Route-specific error handling
app.route('/api/error', async (req, res) => {
  try {
    throw new Error('Something went wrong');
  } catch (error) {
    res.writeHead(500);
    res.end('Route Error');
  }
});
```

## Best Practices

1. **Middleware Order**: Add middleware in the correct order - logging first, then authentication, then route handlers.

2. **Error Handling**: Always implement error handling middleware to catch and process errors appropriately.

3. **Caching**: Use caching for static files and frequently accessed data to improve performance.

4. **Compression**: Enable compression for text-based responses to reduce bandwidth usage.

5. **Security**: Implement proper security middleware for authentication and authorization.

6. **Logging**: Use the built-in logger or implement custom logging for debugging and monitoring.

## TypeScript Support

AeroSSR is written in TypeScript and provides full type definitions. Use TypeScript for better development experience and type safety.

```typescript
import type { 
  RouteHandler,
  Middleware,
  StaticFileOptions,
  LoggerOptions
} from '@obinexuscomputing/aerossr';
```

## Advanced Configuration

### Custom Logger

```typescript
import { Logger } from '@obinexuscomputing/aerossr';

const logger = new Logger({
  logFilePath: 'logs/custom.log'
});

const app = new AeroSSR({
  logger
});
```

### Custom Error Pages

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

## Performance Tips

1. Enable compression for text-based responses
2. Use appropriate cache settings for static files
3. Implement response caching for frequently accessed data
4. Use ETags for client-side caching
5. Monitor memory usage with the built-in cache size limits

## Debugging

Enable debug logging for troubleshooting:

```typescript
const app = new AeroSSR({
  logFilePath: 'logs/debug.log'
});
```

## Contributing

Please see CONTRIBUTING.md for guidelines on contributing to AeroSSR.