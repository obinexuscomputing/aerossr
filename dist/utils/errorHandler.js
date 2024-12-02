"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.generateErrorPage = void 0;
function generateErrorPage(statusCode, message) {
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
exports.generateErrorPage = generateErrorPage;
async function handleError(error, _req, res) {
    console.error('Server error:', error);
    const statusCode = error.statusCode || 500;
    const errorPage = generateErrorPage(statusCode, error.message);
    res.writeHead(statusCode, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
    });
    res.end(errorPage);
}
exports.handleError = handleError;
//# sourceMappingURL=errorHandler.js.map