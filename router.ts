import {getRouteFilePaths, loadRouteModule, extractRouteHandlers, toRoutePath, handleError } from './routes/_utils.ts'
import {Context, HandlerFunction, Route} from './routes/_types.ts'
import { validateRoute } from "./middlewares/routeValidatior.ts";

// Preload all route modules at startup
const routes: Route[] = [];


/**
 * Main function that initializes all routes by scanning, importing,
 * and processing route files from the ROUTES_DIR.
 * 
 * Adds valid routes (with HTTP handlers) to the global `routes` array.
 * 
 * @async
 * @returns {Promise<void>} Resolves when all routes have been processed.
 */
const initializeRoutesFromFS = async (): Promise<void> => {
  try {
    const filePaths = await getRouteFilePaths();
    for (const filePath of filePaths) {
      try {
        const mod = await loadRouteModule(filePath);
        const methods = extractRouteHandlers(mod);
        if (Object.keys(methods).length > 0) {
          const routePath = toRoutePath(filePath);
          const segments = routePath.split("/").filter(Boolean); //.filter(Boolean) removes any empty strings
          routes.push({ path: routePath, segments, methods });
        }
      } catch (error) {
        console.error(`Failed to load route from ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to load routes:", error);
  }
}

const handleRequestFunction = async (handler: HandlerFunction, ctx: Context) => {
  const REQUEST_TIMEOUT = 30000; // 30 seconds
  // Execute handler with timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);

  try {
    const result = await Promise.race([
      handler(ctx),
      new Promise<never>((_, reject) => {
        timeoutController.signal.addEventListener("abort", () => {
          reject(new Error("Request timeout"));
        });
      })
    ]);

    clearTimeout(timeoutId);

    return result instanceof Response
      ? result
      : new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    clearTimeout(timeoutId);
    return handleError(error)
  }
}

export const handleRequest = async(req: Request) => { //If there is an error that's the Response, otherwise it continues to execute the handler for the route and method
  return await validateRoute(req, routes, handleRequestFunction) 
}


/* export async function handleRequest(req: Request): Promise<Response> {

  const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
  const REQUEST_TIMEOUT = 30000; // 30 seconds

  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  // Basic security checks
  if (!isValidPath(url.pathname)) {
    return new Response("Bad Request", { status: 400 });
  }

  // Check content length
  if (!isContentLengthValid(req, MAX_REQUEST_SIZE, method)) {
    return new Response("Request Too Large", { status: 413 });
  }

  const match = matchRoute(url.pathname, routes);
  if (!match) {
    return new Response("Not Found", { status: 404 });
  }

  const handler = match.route.methods[method];
  if (!handler) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Execute handler with timeout
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);

  // Create a mini context
  const ctx = {
    req,
    params: match.params,
    query: Object.fromEntries(url.searchParams),
    json: () => req.json(),
    text: () => req.text(),
  };

  try {
      const result = await Promise.race([
        handler(ctx),
        new Promise<never>((_, reject) => {
          timeoutController.signal.addEventListener("abort", () => {
            reject(new Error("Request timeout"));
          });
        })
      ]);

      clearTimeout(timeoutId);

      if (result instanceof Response) {
        return result;
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        console.error("Handler error:", error);
        
        if (error.message === "Request timeout") {
          return new Response("Request Timeout", { status: 408 });
        }
        
        if (error.message === "Invalid JSON") {
          return new Response("Bad Request", { status: 400 });
        }
      }
      
      return new Response("Internal Server Error", { status: 500 });
    }
} */

initializeRoutesFromFS()


/* import { extname, relative } from "https://deno.land/std@0.224.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";

const ROUTES_DIR = "./routes";
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Type definitions
interface RouteContext {
  req: Request;
  params: Record<string, string>;
  query: Record<string, string>;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

type RouteHandler = (ctx: RouteContext) => Promise<Response | unknown>;

interface Route {
  path: string;
  segments: string[];
  methods: Record<string, RouteHandler>;
}

interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

// Route storage
const routes: Route[] = [];
const routeCache = new Map<string, RouteMatch | null>();

// Utility functions
function isValidPath(path: string): boolean {
  // Basic path validation to prevent directory traversal
  return !path.includes("..") && !path.includes("\\") && path.length < 2000;
}

function toRoutePath(filePath: string): string {
  const relativePath = relative(ROUTES_DIR, filePath).replace(extname(filePath), "");
  const cleaned = relativePath === "index" ? "" : relativePath;
  return "/" + cleaned.replace(/\[([^\]]+)\]/g, ":$1");
}

function matchRoute(urlPath: string): RouteMatch | null {
  // Check cache first
  if (routeCache.has(urlPath)) {
    return routeCache.get(urlPath)!;
  }

  const pathSegments = urlPath.split("/").filter(Boolean);

  for (const route of routes) {
    // Handle root path case - both empty segments arrays should match
    if (route.segments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    
    // If both are empty (root path), it's a match
    if (route.segments.length === 0 && pathSegments.length === 0) {
      const result = { route, params };
      routeCache.set(urlPath, result);
      return result;
    }

    const matched = route.segments.every((seg, i) => {
      if (seg.startsWith(":")) {
        try {
          params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
          return true;
        } catch {
          return false; // Invalid URL encoding
        }
      }
      return seg === pathSegments[i];
    });

    if (matched) {
      const result = { route, params };
      routeCache.set(urlPath, result);
      return result;
    }
  }

  routeCache.set(urlPath, null);
  return null;
}

// Route loading with error handling
async function initializeRoutesFromFS(): Promise<void> {
  try {
    const startTime = performance.now();
    
    for await (const entry of walk(ROUTES_DIR, { 
      exts: [".ts"], 
      includeDirs: false,
      maxDepth: 10 // Prevent infinite recursion
    })) {
      try {
        const filePath = entry.path;
        const fileUrl = new URL(`file://${Deno.realPathSync(filePath)}`);
        const mod = await import(fileUrl.href);
        
        const routePath = toRoutePath(filePath);
        const segments = routePath.split("/").filter(Boolean);

        const methods: Record<string, RouteHandler> = {};
        for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]) {
          if (typeof mod[method] === "function") {
            methods[method] = mod[method];
          }
        }

        if (Object.keys(methods).length > 0) {
          routes.push({ path: routePath, segments, methods });
        }
      } catch (error) {
        console.error(`Failed to load route from ${entry.path}:`, error);
        // Continue loading other routes
      }
    }

    const loadTime = performance.now() - startTime;
    console.log(`Loaded ${routes.length} routes in ${loadTime.toFixed(2)}ms`);
  } catch (error) {
    console.error("Failed to load routes:", error);
    throw error;
  }
}

// Enhanced request handler
export async function handleRequest(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    // Basic security checks
    if (!isValidPath(url.pathname)) {
      return new Response("Bad Request", { status: 400 });
    }

    // Check content length
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response("Request Too Large", { status: 413 });
    }

    const match = matchRoute(url.pathname);
    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const handler = match.route.methods[method];
    if (!handler) {
      // Return allowed methods in response
      const allowedMethods = Object.keys(match.route.methods).join(", ");
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: { "Allow": allowedMethods }
      });
    }

    // Create enhanced context with error handling
    const ctx: RouteContext = {
      req,
      params: match.params,
      query: Object.fromEntries(url.searchParams),
      json: async () => {
        try {
          return await req.json();
        } catch (error) {
          throw new Error("Invalid JSON");
        }
      },
      text: async () => {
        try {
          return await req.text();
        } catch (error) {
          throw new Error("Failed to read request body");
        }
      },
    };

    // Execute handler with timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);

    try {
      const result = await Promise.race([
        handler(ctx),
        new Promise<never>((_, reject) => {
          timeoutController.signal.addEventListener("abort", () => {
            reject(new Error("Request timeout"));
          });
        })
      ]);

      clearTimeout(timeoutId);

      if (result instanceof Response) {
        return result;
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        console.error("Handler error:", error);
        
        if (error.message === "Request timeout") {
          return new Response("Request Timeout", { status: 408 });
        }
        
        if (error.message === "Invalid JSON") {
          return new Response("Bad Request", { status: 400 });
        }
      }
      
      return new Response("Internal Server Error", { status: 500 });
    }
  } catch (error) {
    console.error("Request handling error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Initialize routes
export async function initializeRouter(): Promise<void> {
  await initializeRoutesFromFS();
}

// Export for testing
export { matchRoute, toRoutePath, routes }; */