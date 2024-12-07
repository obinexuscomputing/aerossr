
  
  export function injectMetaTags(
    html: string,
    meta: MetaTags = {},
    defaultMeta: MetaTags = {}
  ): string {
    const finalMeta = { ...defaultMeta, ...meta };
  
    const metaTags = `
      <meta charset="${finalMeta.charset}">
      <meta name="viewport" content="${finalMeta.viewport}">
      <meta name="description" content="${finalMeta.description}">
      <title>${finalMeta.title}</title>
    `;
  
    return html.replace('</head>', `${metaTags}</head>`);
  }