// Type definitions
export interface RouteContext {
  req: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

export type RouteHandler = (ctx: RouteContext) => Promise<Response | unknown>;

export interface Route {
  path: string;
  segments: string[];
  methods: Record<string, RouteHandler>;
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

export interface Context {
    req: Request;
    params: Record<string, string>;
    query: {
        [k: string]: string;
    };
    json: () => Promise<unknown>;
    text: () => Promise<string>;
}

export type HandlerFunction = (ctx: Context) => Promise<Response | unknown>;
export type RequestHandlerFunction = (handler: HandlerFunction, ctx: Context) => Promise<Response>