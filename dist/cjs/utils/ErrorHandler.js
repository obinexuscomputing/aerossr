/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
'use strict';

class ErrorHandler {
    defaultStyles;
    showStack;
    showDetails;
    logger;
    constructor(options = {}) {
        this.defaultStyles = options.styles || `
      body { 
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.5;
        color: #333;
      }
      .error {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        padding: 1.5rem;
        border-radius: 6px;
        margin: 1rem 0;
      }
      .error-title {
        color: #721c24;
        margin: 0 0 1rem;
      }
      .error-message {
        margin: 0 0 1rem;
        font-size: 1.1rem;
      }
      .details {
        margin-top: 1.5rem;
        padding: 1rem;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9rem;
        white-space: pre-wrap;
        overflow-x: auto;
      }
      .details-title {
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #495057;
      }
    `;
        this.showStack = options.showStack ?? process.env.NODE_ENV !== 'production';
        this.showDetails = options.showDetails ?? process.env.NODE_ENV !== 'production';
        this.logger = options.logger;
    }
    static generateBasicErrorPage(statusCode, message) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Error ${statusCode}</title>
          <style>
            body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
            .error { background: #f8d7da; padding: 1rem; border-radius: 4px; }
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
    generateErrorPage(statusCode, message, error, options = {}) {
        const styles = options.styles || this.defaultStyles;
        const showStack = options.showStack ?? this.showStack;
        const showDetails = options.showDetails ?? this.showDetails;
        let details = '';
        if (error && showDetails) {
            const detailsContent = [];
            if (error.code) {
                detailsContent.push(`<div class="details-title">Error Code:</div>${error.code}`);
            }
            if (error.details) {
                detailsContent.push(`<div class="details-title">Details:</div>${JSON.stringify(error.details, null, 2)}`);
            }
            if (error.stack && showStack) {
                detailsContent.push(`<div class="details-title">Stack Trace:</div>${error.stack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
            }
            if (error.cause && showStack) {
                detailsContent.push(`<div class="details-title">Cause:</div>${error.cause.stack?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || error.cause.message}`);
            }
            if (detailsContent.length > 0) {
                details = `<div class="details">${detailsContent.join('\n')}</div>`;
            }
        }
        return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error ${statusCode}</title>
          <style>${styles}</style>
      </head>
      <body>
          <h1 class="error-title">Error ${statusCode}</h1>
          <div class="error">
              <p class="error-message">${message}</p>
              ${details}
          </div>
          <script>
            // Automatically retry on certain errors
            ${statusCode === 503 ? 'setTimeout(() => window.location.reload(), 5000);' : ''}
          </script>
      </body>
      </html>
    `;
    }
    async handleError(error, req, res) {
        try {
            const statusCode = error.statusCode || 500;
            const message = error.message || 'Internal Server Error';
            // Log error details
            const errorDetails = {
                statusCode,
                message,
                path: req.url,
                method: req.method,
                headers: req.headers,
                error: {
                    name: error.name,
                    code: error.code,
                    stack: error.stack,
                    details: error.details,
                    cause: error.cause
                }
            };
            if (this.logger) {
                await this.logger.error(`Server error: ${JSON.stringify(errorDetails, null, 2)}`);
            }
            else {
                console.error('Server error:', errorDetails);
            }
            // Only set headers if they haven't been sent
            if (!res.headersSent) {
                res.writeHead(statusCode, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-store, must-revalidate',
                    'X-Content-Type-Options': 'nosniff'
                });
                const errorPage = this.generateErrorPage(statusCode, message, error);
                res.end(errorPage);
            }
        }
        catch (handlingError) {
            // Fallback error handling if something goes wrong during error handling
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(ErrorHandler.generateBasicErrorPage(500, 'Internal Server Error'));
            }
            console.error('Error during error handling:', handlingError);
        }
    }
    static async handleErrorStatic(error, req, res, options) {
        const handler = new ErrorHandler(options);
        await handler.handleError(error, req, res);
    }
}

exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=ErrorHandler.js.map
