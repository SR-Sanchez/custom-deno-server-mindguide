import { extname, relative } from "https://deno.land/std/path/mod.ts";
import { walk } from "https://deno.land/std/fs/walk.ts";
import {Route, RouteHandler} from './_types.ts'

const ROUTES_DIR = "./routes";

/**
 * Recursively collects all `.ts` route file paths from the ROUTES_DIR directory.
 * 
 * @async
 * @returns {Promise<string[]>} A promise that resolves to an array of route file paths.
 */
export const getRouteFilePaths = async (): Promise<string[]> => {
	const paths: string[] = [];
	for await (const entry of walk(ROUTES_DIR, { exts: [".ts"], includeDirs: false })) {
		paths.push(entry.path);
	}
	return paths;
}


/**
 * Dynamically imports a route module (the actual .ts file) given its file path.
 * 
 * @async
 * @param {string} filePath - The absolute path to the route file.
 * @returns {Promise<Record<string, unknown>>} A promise resolving to the imported module.
 */
export const loadRouteModule = async (filePath: string): Promise<Record<string, unknown>> => {
	return await import("file://" + Deno.realPathSync(filePath));
}

/**
 * Extracts valid HTTP method handlers (eg.: const GET = async()...) from a route module.
 * 
 * Looks for functions named GET, POST, PUT, DELETE, PATCH and collects them.
 * 
 * @param {Record<string, unknown>} mod - The imported route module.
 * @returns {Record<string, RouteHandler>} An object mapping HTTP methods to handler functions.
 */
export const extractRouteHandlers = (mod: Record<string, unknown>): Record<string, RouteHandler> => {
	const methods: Record<string, RouteHandler> = {};
	for (const method of ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
		if (typeof mod[method] === "function") {
			methods[method] = mod[method] as RouteHandler;
		}
	}
	return methods;
}

/**
 * Converts an absolute route file path to a normalized route path string.
 * 
 * The function:
 * - Removes the file extension (e.g., `.ts`).
 * - Makes the path relative to the `ROUTES_DIR`.
 * - Converts `[param]` syntax to Express-style `:param` for dynamic route segments.
 * - Converts `"index"` paths to root-level `/` routes.
 * 
 * @param {string} filePath - The absolute file path to convert.
 * @returns {string} A normalized route path suitable for routing (e.g., `/users/:id`).
 */
export const toRoutePath = (filePath: string): string => {
	const relativePath = relative(ROUTES_DIR, filePath).replace(extname(filePath), ""); //Creates the relative path and removes the extension (.ts)
	return "/" + (
		relativePath === "index" 
		? "" 
		: relativePath).replace(/\[([^\]]+)\]/g, ":$1"); //it replaces any dynamic route segments written as [param] with Express-style :param syntax. (eg.: "[id]" becomes ":id")
}

export function matchRoute(urlPath: string, routes: Route[]): { route: typeof routes[0]; params: Record<string, string> } | null {
	const pathSegments = urlPath.split("/").filter(Boolean);

	for (const route of routes) {
		if (route.segments.length !== pathSegments.length) continue; // what continue does --> If the condition is true, skip the rest of this iteration and jump straight to the next one in the loop

		const params: Record<string, string> = {};
		const matched = route.segments.every((seg, i) => { // every --> Does everything in this array pass a condition? returns a boolean (returns early if false)
			if (seg.startsWith(":")) {
				params[seg.slice(1)] = decodeURIComponent(pathSegments[i]);
				return true;
			}
			return seg === pathSegments[i];
		});

		if (matched) return { route, params };
	}

	return null;
}

export const isValidPath = (path: string): boolean => {
  // Basic path validation to prevent directory traversal
  return !path.includes("..") && !path.includes("\\") && path.length < 2000;
}

export const isContentLengthValid = (req: Request, maxRequestSize: number, method: string) => {
	const validMethods = ['POST', 'PUT', 'PATCH'];
  if (!validMethods.includes(method)) {
    return true; // No body expected, so skip size check
  }

  const contentLength = req.headers.get("content-length");
  const length = contentLength ? parseInt(contentLength, 10) : 0;

  if (isNaN(length)) return false;

  return length <= maxRequestSize;
}


export const createContext = (req: Request, params: Record<string, string>, url: URL) => {
	return {
		req,
    params,
    query: Object.fromEntries(url.searchParams),
    json: () => req.json(),
    text: () => req.text(),
	}
}

// ---- Responses ----
export const badRequest = (customError: string = "") => new Response(`Bad Request ${customError}`, { status: 400 });
export const tooLong = () => new Response("Request Too Large", { status: 413 });
export const notFound = () => new Response("Not Found", { status: 404 });
export const methodNotAllowed = () => new Response("Method Not Allowed", { status: 405 });
export const requestTimeOut = () => new Response("Request Timeout", { status: 408 });
export const internalServerError = (error: string = "Internal Server Error") => new Response(error, { status: 500 });

export const handleError = (error: Error | unknown) => {
	if (error instanceof Error) {
		console.error("Handler error:", error);
		
		if (error.message === "Request timeout") return requestTimeOut()
		if (error.message === "Invalid JSON") return badRequest()
	}
	return internalServerError()
}