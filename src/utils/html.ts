export interface MetaTags {
  title?: string;
  description?: string;
  charset?: string;
  viewport?: string;
  keywords?: string;
  author?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  [key: string]: string | undefined;
}

export function injectMetaTags(
  html: string,
  meta: MetaTags = {},
  defaultMeta: MetaTags = {}
): string {
  const finalMeta: MetaTags = {
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