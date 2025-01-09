import { IncomingMessage, ServerResponse } from "http";


describe('Router', () => {
  let router: Router;
  let mockReq: Partial<IncomingMessage>;
  let mockRes: Partial<ServerResponse>;

  beforeEach(() => {
    router = new Router();
    mockReq = {
      url: '/test',
      method: 'GET'
    };
    mockRes = {
      setHeader: jest.fn(),
      end: jest.fn()
    };
  });

  describe('Route Matching', () => {
    it('should match static routes', async () => {
      const handler = jest.fn();
      router.get('/test').handler(handler).build();
      
      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(handler).toHaveBeenCalled();
    });

    it('should extract path parameters', async () => {
      let capturedParams: Record<string, string> = {};
      const handler = jest.fn((ctx: RouteContext) => {
        capturedParams = ctx.params;
        return Promise.resolve();
      });

      router.get('/users/:id').handler(handler).build();
      mockReq.url = '/users/123';

      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(capturedParams).toEqual({ id: '123' });
    });

    it('should extract query parameters', async () => {
      let capturedQuery: Record<string, string> = {};
      const handler = jest.fn((ctx: RouteContext) => {
        capturedQuery = ctx.query;
        return Promise.resolve();
      });

      router.get('/search').handler(handler).build();
      mockReq.url = '/search?q=test&page=1';

      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(capturedQuery).toEqual({ q: 'test', page: '1' });
    });

    it('should throw error for unmatched routes', async () => {
      mockReq.url = '/nonexistent';
      await expect(
        router.handle(mockReq as IncomingMessage, mockRes as ServerResponse)
      ).rejects.toThrow('No route found');
    });
  });

  describe('Middleware', () => {
    it('should execute middleware in order', async () => {
      const order: number[] = [];
      const middleware1 = jest.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        order.push(1);
        await next();
      });
      const middleware2 = jest.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        order.push(2);
        await next();
      });
      const handler = jest.fn(async () => {
        order.push(3);
      });

      router.get('/test')
        .middleware(middleware1, middleware2)
        .handler(handler)
        .build();

      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow middleware to modify context', async () => {
      let modifiedContext: RouteContext | null = null;
      const middleware = jest.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        ctx.query.modified = 'true';
        await next();
      });
      const handler = jest.fn((ctx: RouteContext) => {
        modifiedContext = ctx;
        return Promise.resolve();
      });

      router.get('/test')
        .middleware(middleware)
        .handler(handler)
        .build();

      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(modifiedContext?.query.modified).toBe('true');
    });
  });

  describe('Route Groups', () => {
    it('should group routes with shared prefix', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.group('/api', (r) => {
        r.get('/users').handler(handler1).build();
        r.get('/posts').handler(handler2).build();
      });

      mockReq.url = '/api/users';
      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(handler1).toHaveBeenCalled();

      mockReq.url = '/api/posts';
      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Observers', () => {
    it('should notify observers of route lifecycle events', async () => {
      const observer: RouteObserver = {
        onRouteMatched: jest.fn(),
        onRouteExecuted: jest.fn(),
        onRouteError: jest.fn()
      };

      router.addObserver(observer);
      const handler = jest.fn();
      router.get('/test').handler(handler).build();

      await router.handle(mockReq as IncomingMessage, mockRes as ServerResponse);
      
      expect(observer.onRouteMatched).toHaveBeenCalled();
      expect(observer.onRouteExecuted).toHaveBeenCalled();
      expect(observer.onRouteError).not.toHaveBeenCalled();
    });

    it('should notify observers of errors', async () => {
      const observer: RouteObserver = {
        onRouteMatched: jest.fn(),
        onRouteExecuted: jest.fn(),
        onRouteError: jest.fn()
      };

      router.addObserver(observer);
      const handler = jest.fn().mockRejectedValue(new Error('Test error'));
      router.get('/test').handler(handler).build();

      await expect(
        router.handle(mockReq as IncomingMessage, mockRes as ServerResponse)
      ).rejects.toThrow('Test error');

      expect(observer.onRouteMatched).toHaveBeenCalled();
      expect(observer.onRouteError).toHaveBeenCalled();
    });
  });

  describe('Route Builder', ()