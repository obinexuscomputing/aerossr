/*!
 * @obinexuscomputing/aerossr v0.1.1
 * (c) 2025 OBINexus Computing
 * Released under the ISC License
 */
'use strict';

function injectMetaTags(html, meta = {}, defaultMeta = {}) {
    const finalMeta = {
        charset: 'utf-8',
        viewport: 'width=device-width, initial-scale=1.0',
        ...defaultMeta,
        ...meta
    };
    const metaTags = Object.entries(finalMeta)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
        if (key === 'title') {
            return `<title>${value}</title>`;
        }
        if (key.startsWith('og')) {
            return `<meta property="og:${key.slice(2).toLowerCase()}" content="${value}">`;
        }
        if (key.startsWith('twitter')) {
            return `<meta name="twitter:${key.slice(7).toLowerCase()}" content="${value}">`;
        }
        if (key === 'charset') {
            return `<meta charset="${value}">`;
        }
        return `<meta name="${key}" content="${value}">`;
    })
        .join('\n    ');
    return html.replace('</head>', `    ${metaTags}\n  </head>`);
}

exports.injectMetaTags = injectMetaTags;
/*!
 * End of bundle for @obinexuscomputing/aerossr
 */
//# sourceMappingURL=html.js.map
