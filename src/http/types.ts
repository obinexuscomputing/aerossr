import { Request } from './request/Request';
import { Response } from './response/Response';

export interface RequestContext {
  req: Request;
  res: Response;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  state: Record<string, unknown>;
}
