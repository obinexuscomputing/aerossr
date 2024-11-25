# AeroSSR API Reference

## Core Classes

### AeroSSR

The main server class that handles HTTP requests, routing, and middleware.

```typescript
import { AeroSSR } from '@obinexuscomputing/aerossr';

const server = new AeroSSR({
  port: 3000,
  cacheMaxAge: 3600,
  corsOrigins: '*',
  compression: true,
  logFilePath: 'logs/server.log'
});
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | 3000 | Server port number |
| `cacheMaxAge` | number | 3600 | Cache duration in seconds |
| `corsOrigins` | string | '*' | CORS allowed origins |
| `compression` | boolean | true | Enable response compression |
| `logFilePath` | string \| null | null | Path for log file |

#### Methods

##### `start(): Promise<http.Server>`
Starts the HTTP server. Returns a Promise that resolves with the server instance.

```typescript
await server.start();
```

##### `stop(): Promise<void>`
Gracefully stops the server.

```typescript
await server.stop();
```

##### `route(path: string, handler: RouteHandler): void`
Registers a route handler for the specified path.

```typescript
server.route('/api/users', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ users: [] }));
});
```

##### `use(middleware: Middleware): void`
Adds middleware to the processing pipeline.

```typescript
server.use(async (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  await next();
});
```

##### `clearCache(): void`
Clears internal caches.

### StaticFileMiddleware

Handles serving static files with caching and compression.

```typescript
import { StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const static = new StaticFileMiddleware({
  root: 'public',
  maxAge: 86400,
  compression: true
});
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | string | - | Root directory for static files |
| `maxAge` | number | 86400 | Cache duration in seconds |
| `index` | string[] | ['index.html'] | Index file names |
| `dotFiles` | 'ignore'\|'allow'\|'deny' | 'ignore' | How to handle dot files |
| `compression` | boolean | true | Enable compression |
| `etag` | boolean | true | Enable ETag generation |

## Utility Functions

### `createCache<T>()`
Creates a new cache store for type T.

```typescript
import { createCache } from '@obinexuscomputing/aerossr';

const cache = createCache<string>();
cache.set('key', 'value');
const value = cache.get('key');
```

### `generateETag(content: string | Buffer)`
Generates an ETag for content.

```typescript
import { generateETag } from '@obinexuscomputing/aerossr';

const etag = generateETag(content);
```

### `setCorsHeaders(res: ServerResponse, origins?: string)`
Sets CORS headers on a response.

```typescript
import { setCorsHeaders } from '@obinexuscomputing/aerossr';

setCorsHeaders(res, 'http://example.com');
```

## Types

### RouteHandler
```typescript
type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse
) => Promise<void> | void;
```

### Middleware
```typescript
type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => Promise<void>
) => Promise<void>;
```

### LoggerOptions
```typescript
interface LoggerOptions {
  logFilePath?: string | null;
}
```

### StaticFileOptions
```typescript
interface StaticFileOptions {
  root: string;
  maxAge?: number;
  index?: string[];
  dotFiles?: 'ignore' | 'allow' | 'deny';
  compression?: boolean;
  etag?: boolean;
  cacheSize?: number;
}
```