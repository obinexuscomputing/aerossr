# AeroSSR Example Project

This example demonstrates how to set up and use the AeroSSR server framework, a lightweight Node.js server-side rendering solution with built-in support for static file serving, middleware, routing, caching, and compression.

## Features Demonstrated

- Static file serving with caching and compression
- API route handling with TypeScript
- Logging configuration
- Error handling
- Graceful server shutdown
- Middleware implementation
- CORS and ETag support

## Project Setup

1. Create a new project:
```bash
mkdir aerossr-example
cd aerossr-example
npm init -y
```

2. Install dependencies:
```bash
# Install AeroSSR and its peer dependencies
npm install @obinexuscomputing/aerossr

# Install development dependencies
npm install -D typescript @types/node
```

3. Configure TypeScript (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Project Structure

```
aerossr-example/
├── public/                # Static files
│   └── index.html        # Default HTML template
├── src/                  # Source code
│   └── index.ts          # Server entry point
├── logs/                 # Log files
├── package.json          # Project configuration
└── tsconfig.json         # TypeScript configuration
```

## Implementation

1. Create default HTML template (`public/index.html`):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroSSR Demo</title>
</head>
<body>
    <h1>Welcome to AeroSSR</h1>
    <div id="app"></div>
</body>
</html>
```

2. Configure package scripts (`package.json`):
```json
{
  "type": "module",
  "scripts": {
    "prepare": "mkdir -p logs && touch logs/server.log",
    "prebuild": "npm run prepare",
    "build": "tsc",
    "start": "node --experimental-specifier-resolution=node dist/index.js",
    "dev": "tsc -w"
  }
}
```

3. Implement server (`src/index.ts`):
```typescript
import { fileURLToPath } from 'url';
import { IncomingMessage, Server, ServerResponse } from 'http';
import path from 'path';
import { mkdir, access, constants, writeFile } from 'fs/promises';
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function ensureLogDirectory(logPath: string): Promise<void> {
    const logDir = path.dirname(logPath);
    try {
        await mkdir(logDir, { recursive: true, mode: 0o755 });
        try {
            await access(logPath, constants.F_OK);
        } catch {
            await writeFile(logPath, '', { mode: 0o644 });
        }
        await access(logPath, constants.W_OK);
    } catch (error) {
        console.error(`Failed to setup logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function createServer(): Promise<AeroSSR> {
    const logPath = path.join(projectRoot, 'logs', 'server.log');
    await ensureLogDirectory(logPath);
    
    return new AeroSSR({
        port: 3000,
        compression: true,
        logFilePath: logPath,
        defaultMeta: {
            title: 'AeroSSR Demo',
            description: 'A demo application using AeroSSR',
            charset: 'UTF-8',
            viewport: 'width=device-width, initial-scale=1.0'
        }
    });
}

async function setupRoutes(app: AeroSSR): Promise<void> {
    const staticMiddleware = new StaticFileMiddleware({
        root: path.join(projectRoot, 'public'),
        maxAge: 86400, // 24 hours
        compression: true,
        etag: true,
        index: ['index.html']
    });
    
    app.use(staticMiddleware.middleware());

    // Example API route
    app.route('/api/hello', async (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            message: 'Hello from AeroSSR!',
            timestamp: new Date().toISOString()
        }));
    });
}

async function main(): Promise<Server> {
    try {
        const app = await createServer();
        await setupRoutes(app);

        const server = await app.start();
        console.log(`Server running on http://localhost:${app.config.port}`);
        
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}

if (process.env.NODE_ENV !== 'test') {
    main().catch(error => {
        console.error('Application startup failed:', error);
        process.exit(1);
    });
}

export { main };
```

## Running the Example

1. Build the project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Testing the Server

1. View the HTML page:
```
http://localhost:3000
```

2. Test the API endpoint:
```
http://localhost:3000/api/hello
```

## Available Features

### Static File Serving
- Automatic compression for text files
- ETags for caching
- Index file support
- Custom MIME type handling

### API Routes
- Async route handlers
- JSON response handling
- Error handling
- CORS support

### Logging
- File-based logging
- Request logging
- Error logging
- Custom log paths

### Caching
- Static file caching
- ETag support
- Custom cache duration
- Memory caching

## Next Steps

1. Add custom middleware:
```typescript
app.use(async (req, res, next) => {
    const start = Date.now();
    await next();
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
});
```

2. Implement error handling:
```typescript
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

3. Add CORS configuration:
```typescript
const app = new AeroSSR({
    corsOrigins: 'http://localhost:3000'
});
```

For more advanced features and configuration options, refer to the main [AeroSSR documentation](https://github.com/yourusername/aerossr).

## License

This example project is licensed under the MIT License.