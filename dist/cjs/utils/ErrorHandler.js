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
    static async handleError(error, req, res) {
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
        const errorPage = new ErrorHandler().generateErrorPage(statusCode, message, error);
        res.writeHead(statusCode, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(errorPage);
    }
    constructor(options = {}) {
        this.defaultStyles = options.styles || `
      body { font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto; }
      .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; }
      .details { margin-top: 1rem; font-family: monospace; white-space: pre-wrap; }
    `;
        this.showStack = options.showStack ?? process.env.NODE_ENV !== 'production';
        this.showDetails = options.showDetails ?? process.env.NODE_ENV !== 'production';
    }
    generateErrorPage(statusCode, message, error, options = {}) {
        const styles = options.styles || this.defaultStyles;
        const showStack = options.showStack ?? this.showStack;
        const showDetails = options.showDetails ?? this.showDetails;
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
    async handleError(error, req, res) {
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
        const errorPage = this.generateErrorPage(statusCode, message, error);
        res.writeHead(statusCode, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff'
        });
        res.end(errorPage);
    }
}

exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=ErrorHandler.js.map
