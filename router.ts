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

initializeRoutesFromFS()
