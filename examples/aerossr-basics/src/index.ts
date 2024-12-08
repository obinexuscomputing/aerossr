import { fileURLToPath } from 'url';
import { IncomingMessage, Server, ServerResponse } from 'http';
import path from 'path';
import { mkdir, access, constants, writeFile } from 'fs/promises';
import { AeroSSR, StaticFileMiddleware } from '@obinexuscomputing/aerossr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Ensures the log directory and file exist and are writable
 */
async function ensureLogDirectory(logPath: string): Promise<void> {
    const logDir = path.dirname(logPath);
    
    try {
        // Create the directory if it doesn't exist
        await mkdir(logDir, { recursive: true, mode: 0o755 });
        
        // Try to access the log file, if it doesn't exist, create it
        try {
            await access(logPath, constants.F_OK);
        } catch {
            await writeFile(logPath, '', { mode: 0o644 });
        }
        
        // Verify we have write permissions
        await access(logPath, constants.W_OK);
    } catch (error) {
        console.error(`Failed to setup logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            viewport: 'width=device-width, initial-scale=1.0'
        }
    });
}

/**
 * Sets up routes and middleware for the server
 */
async function setupRoutes(app: AeroSSR): Promise<void> {
    // Set up static file serving for the public directory
    const staticMiddleware = new StaticFileMiddleware({
        root: path.join(projectRoot, 'public'),
        maxAge: 86400,
        compression: true,
        etag: true,
        index: ['index.html'] // Specify index file
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

    // Default route handler for all other routes
    app.route('/', async (_req: IncomingMessage, res: ServerResponse) => {
        const staticMiddleware = new StaticFileMiddleware({
            root: path.join(projectRoot, 'public'),
            index: ['index.html']
        });
        await staticMiddleware.middleware()(_req, res, () => Promise.resolve());
    });
}

// ... rest of the code remains the same ...

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
    main().catch(error => {
        console.error('Application startup failed:', error);
        process.exit(1);
    });
}

export { main };