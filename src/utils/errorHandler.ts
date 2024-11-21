import { IncomingMessage, ServerResponse } from 'http';

export function generateErrorPage(statusCode: number, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error ${statusCode}</title>
        <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>Error ${statusCode}</h1>
        <div class="error">
            <p>${message}</p>
        </div>
    </body>
    </html>
  `;
}

export async function handleError(
  error: Error & { statusCode?: number },
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  console.error('Server error:', error);

  const statusCode = error.statusCode || 500;
  const errorPage = generateErrorPage(statusCode, error.message);

  res.writeHead(statusCode, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store',
  });
  res.end(errorPage);
}