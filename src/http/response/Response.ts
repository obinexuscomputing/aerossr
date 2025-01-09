
import { ServerResponse } from 'http';

export class Response {
  public readonly raw: ServerResponse;
  private headersSent: boolean = false;

  constructor(res: ServerResponse) {
    this.raw = res;
  }

  public status(code: number): this {
    this.raw.statusCode = code;
    return this;
  }

  public header(name: string, value: string): this {
    if (!this.headersSent) {
      this.raw.setHeader(name, value);
    }
    return this;
  }

  public type(type: string): this {
    return this.header('Content-Type', type);
  }

  public send(body: any): void {
    if (this.headersSent) return;

    if (typeof body === 'string') {
      this.type('text/plain').end(body);
    } else if (Buffer.isBuffer(body)) {
      this.type('application/octet-stream').end(body);
    } else if (typeof body === 'object') {
      this.type('application/json').end(JSON.stringify(body));
    } else {
      this.type('text/plain').end(String(body));
    }
  }

  public json(body: any): void {
    this.type('application/json').send(JSON.stringify(body));
  }

  public end(data?: string | Buffer): void {
    this.headersSent = true;
    this.raw.end(data);
  }
}