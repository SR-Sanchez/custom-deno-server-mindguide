import { matchRoute, isValidPath, isContentLengthValid, createContext, badRequest, tooLong, notFound, methodNotAllowed} from '../routes/_utils.ts'
import { RequestHandlerFunction, Route } from "../routes/_types.ts";


export async function validateRoute(req: Request, routes: Route[], reqHandler: RequestHandlerFunction)  {

  const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
  const url = new URL(req.url); 
  const method = req.method.toUpperCase();

  // Basic security checks
  if (!isValidPath(url.pathname)) return badRequest()
  if (!isContentLengthValid(req, MAX_REQUEST_SIZE, method)) return tooLong()

  const match = matchRoute(url.pathname, routes);
  if (!match) return notFound()

  const handler = match.route.methods[method];
  if (!handler) return methodNotAllowed()

  // Create a mini context
  const ctx = createContext(req, match.params, url)

  return await reqHandler(handler, ctx)
}

