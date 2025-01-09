export * from './request';
export * from './response';


export interface RequestContext {
    req: Request;
    res: Response;
    params: Record<string, string>;
    query: Record<string, string>;
    next: () => Promise<void>;
  }