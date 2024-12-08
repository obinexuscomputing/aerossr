# AeroSSR Example Project

This example demonstrates how to set up and use the AeroSSR server framework for building server-side rendered applications.

## Project Setup

1. Create a new project directory:
```bash
mkdir aerossr-example
cd aerossr-example
```

2. Initialize the project:
```bash
npm init -y
```

3. Install dependencies:
```bash
npm install @obinexuscomputing/aerossr
npm install -D typescript @types/node
```

4. Configure TypeScript by creating `tsconfig.json`:
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

Create the following directory structure:
```
aerossr-example/
├── public/
│   └── index.html
├── src/
│   └── index.ts
├── logs/
├── package.json
└── tsconfig.json
```

## Configuration Files

1. Create `public/index.html`:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AeroSSR Demo</title>
</head>
<body>
    <h1>Welcome to AeroSSR Demo</h1>
    <div id="app"></div>
</body>
</html>
```

2. Update `package.json` scripts:
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

## Server Implementation

Create `src/index.ts`:
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
        maxAge: 86400,
        compression: true,
        etag: true,
        index: ['index.html']
    });
    
    app.use(staticMiddleware.middleware());

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

## Running the Project

1. Build the project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Testing the Server

1. Access the static HTML page:
```
http://localhost:3000
```

2. Test the API endpoint:
```
http://localhost:3000/api/hello
```

## Features Demonstrated

- Static file serving with caching and compression
- API route handling
- Logging configuration
- Error handling
- TypeScript integration
- ES Modules support
- Graceful shutdown handling

## Next Steps

1. Add more routes and middleware
2. Implement custom error pages
3. Add database integration
4. Set up development hot reloading
5. Configure production deployment

For more detailed information about AeroSSR features and configuration options, please refer to the main AeroSSR documentation.