import express from 'express';
import { AeroSSR, StaticFileMiddleware, createCache } from '@obinexuscomputing/aerossr';

// Initialize Express app
const app = express();

// Create an AeroSSR instance
const aero = new AeroSSR({
  port: 3000,
  cacheMaxAge: 3600,
  compression: true,
  logFilePath: 'logs/server.log',
  defaultMeta: {
    title: 'AeroSSR with Express',
    description: 'A seamless integration of AeroSSR with Express',
    charset: 'utf-8',
    viewport: 'width=device-width, initial-scale=1.0',
  },
});

// Create a cache store
const cache = createCache<string>();

// Middleware for static file serving
app.use(
  new StaticFileMiddleware({
    root: 'public',
    maxAge: 86400, // Cache for 1 day
    index: ['index.html'],
    dotFiles: 'ignore',
    compression: true,
    etag: true,
  }).middleware()
);

// Middleware for logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} - ${Date.now() - start}ms`);
  });
  next();
});

// Middleware for caching API responses
app.use((req, res, next) => {
  const cachedResponse = cache.get(req.url);
  if (cachedResponse) {
    console.log(`Cache hit for ${req.url}`);
    res.send(cachedResponse);
  } else {
    // Override res.send to store the response in cache
    const originalSend = res.send.bind(res);
    res.send = (body: any) => {
      cache.set(req.url, body);
      return originalSend(body);
    };
    next();
  }
});

// Routes
app.get('/', async (req, res) => {
  const html = await aero.renderPage({
    content: '<h1>Welcome to AeroSSR with Express</h1>',
    defaultMeta: {
      title: 'Home Page',
      description: 'A sample AeroSSR-Express integration',
    },
  });
  res.send(html);
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express with AeroSSR!' });
});

app.get('/cached', (req, res) => {
  const message = cache.get('greeting') || 'No cached message';
  res.send(message);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const errorPage = aero.generateErrorPage(500, err.message || 'Internal Server Error');
  res.status(500).send(errorPage);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
