import { fileURLToPath } from 'url';
import { IncomingMessage, Server, ServerResponse } from 'http';
import path from 'path';
import { mkdir, access, constants, writeFile } from 'fs/promises';
import { AeroSSR, StaticFileMiddleware } from '../../../dist/esm/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Ensures the log directory and file exist and are writable
 */
async function ensureLogDirectory(logPath: string): Promise<void> {
    const logDir = path.dirname(logPath);

    try {
        // Ensure the log directory exists
        await mkdir(logDir, { recursive: true, mode: 0o755 });

        // Ensure the log file exists, create if not
        try {
            await access(logPath, constants.F_OK);
        } catch {
            await writeFile(logPath, '', { mode: 0o644 });
        }

        // Verify write permissions
        await access(logPath, constants.W_OK);
    } catch (error) {
        console.error(`Failed to set up logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Creates and configures a new AeroSSR server instance
 */
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
            viewport: 'width=device-width, initial-scale=1.0',
        },
    });
}

/**
 * Sets up routes and middleware for the server
 */
async function setupRoutes(app: AeroSSR): Promise<void> {
    const staticMiddleware = new StaticFileMiddleware({
        root: path.join(projectRoot, 'public'),
        maxAge: 86400,
        compression: true,
        etag: true,
        index: ['index.html'], // Default index file
    });

    // Serve static files
    app.use(staticMiddleware.middleware());

    // Example API route
    app.route('/api/hello', async (req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                message: 'Hello from AeroSSR!',
                timestamp: new Date().toISOString(),
            }),
        );
    });

    // Default route handler
    app.route('/', async (req: IncomingMessage, res: ServerResponse) => {
        staticMiddleware
            .middleware()(req, res, () => {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            })
            .catch((error: any) => {
                console.error('Error serving default route:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            });
    });
}

/**
 * Sets up graceful shutdown handling
 */
function setupShutdown(app: AeroSSR): void {
    const shutdown = async (signal: string) => {
        console.log(`\nReceived ${signal}. Gracefully shutting down server...`);
        try {
            await app.stop();
            console.log('Server stopped successfully');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Main application entry point
 */
async function main(): Promise<Server> {
    try {
        const app = await createServer();
        await setupRoutes(app);
        setupShutdown(app);

        const server = await app.start();
        console.log(`Server running on http://localhost:${app.config.port}`);
        console.log('Press Ctrl+C to stop');
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}

// Start the application
if (process.env.NODE_ENV !== 'test') {
    main().catch((error) => {
        console.error('Application startup failed:', error);
        process.exit(1);
    });
}

export { main };
