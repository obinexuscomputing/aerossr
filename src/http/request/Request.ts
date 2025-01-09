import { IncomingMessage } from 'http';
import { ParsedUrlQuery } from 'querystring';
import { parse } from 'url';

export class Request {
  public readonly raw: IncomingMessage;
  public readonly params: Record<string, string>;
  public readonly query: ParsedUrlQuery;
  public readonly path: string;
  public readonly method: string;
  public body: any;

  constructor(req: IncomingMessage, params: Record<string, string> = {}) {
    this.raw = req;
    this.params = params;
    this.method = req.method || 'GET';
    
    const parsedUrl = parse(req.url || '/', true);
    this.path = parsedUrl.pathname || '/';
    this.query = parsedUrl.query;
  }

  public header(name: string): string | undefined {
    return this.raw.headers[name.toLowerCase()];
  }

  public get headers(): Record<string, string | string[] | undefined> {
    return this.raw.headers;
  }

  public accepts(type: string): boolean {
    const accept = this.header('accept');
    if (!accept) return false;
    return accept.includes(type) || accept.includes('*/*');
  }
}