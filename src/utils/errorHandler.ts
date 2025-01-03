import { IncomingMessage, ServerResponse } from 'http';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export interface ErrorPageOptions {
  styles?: string;
  showStack?: boolean;
  showDetails?: boolean;
}

export function generateErrorPage(
  statusCode: number,
  message: string,
  error?: CustomError,
  options: ErrorPageOptions = {}
): string {
  const {
    styles = `
      body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
      .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
      .details { margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
    `,
    showStack = process.env.NODE_ENV !== 'production',
    showDetails = process.env.NODE_ENV !== 'production'
  } = options;

  const details = error && showDetails ? `
    <div class="details">
      <strong>Error Code:</strong> ${error.code || 'UNKNOWN'}<br>
      ${error.details ? `<strong>Details:</strong> ${JSON.stringify(error.details, null, 2)}` : ''}
      ${error.stack && showStack ? `<strong>Stack:</strong>\n${error.stack}` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error ${statusCode}</title>
        <style>${styles}</style>
    </head>
    <body>
        <h1>Error ${statusCode}</h1>
        <div class="error">
            <p>${message}</p>
            ${details}
        </div>
    </body>
    </html>
  `;
}

export async function handleError(
  error: CustomError,
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error('Server error:', {
    statusCode,
    message,
    path: req.url,
    method: req.method,
    error: {
      name: error.name,
      code: error.code,
      stack: error.stack,
      details: error.details
    }
  });

  const errorPage = generateErrorPage(statusCode, message, error);

  res.writeHead(statusCode, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(errorPage);
}