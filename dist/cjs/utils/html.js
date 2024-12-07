'use strict';

function injectMetaTags(html, meta = {}, defaultMeta = {}) {
    const finalMeta = { ...defaultMeta, ...meta };
    const metaTags = `
      <meta charset="${finalMeta.charset}">
      <meta name="viewport" content="${finalMeta.viewport}">
      <meta name="description" content="${finalMeta.description}">
      <title>${finalMeta.title}</title>
    `;
    return html.replace('</head>', `${metaTags}</head>`);
}

exports.injectMetaTags = injectMetaTags;
//# sourceMappingURL=html.js.map
