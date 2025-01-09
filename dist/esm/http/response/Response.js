/*!
  @obinexuscomputing/aerossr v0.1.1
  (c) 2025 OBINexus Computing
  Released under the ISC License
 */
class Response {
    raw;
    headersSent = false;
    constructor(res) {
        this.raw = res;
    }
    status(code) {
        this.raw.statusCode = code;
        return this;
    }
    header(name, value) {
        if (!this.headersSent) {
            this.raw.setHeader(name, value);
        }
        return this;
    }
    type(type) {
        return this.header('Content-Type', type);
    }
    send(body) {
        if (this.headersSent)
            return;
        if (typeof body === 'string') {
            this.type('text/plain').end(body);
        }
        else if (Buffer.isBuffer(body)) {
            this.type('application/octet-stream').end(body);
        }
        else if (typeof body === 'object') {
            this.type('application/json').end(JSON.stringify(body));
        }
        else {
            this.type('text/plain').end(String(body));
        }
    }
    json(body) {
        this.type('application/json').send(JSON.stringify(body));
    }
    end(data) {
        this.headersSent = true;
        this.raw.end(data);
    }
}

export { Response };
//# sourceMappingURL=Response.js.map
