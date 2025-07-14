/* Deno.serve(
  { port: 4000 },
  () => {
    return new Response("Hello Deno!");
  },
); */

import { handleRequest } from "./router.ts";

Deno.serve(
  {port: 9000}, 
  async (req) => {
    try {
      return await handleRequest(req);
    } catch (err) {
      console.error("Server error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
);


/**
 * 6. 🛡️ Should I Add Guards? What Are the Basics?
💯 Yes — even a small server should protect itself. Here are common "guards":

Guard Type	| Purpose
CORS | 	Control what origins can access your API
Rate Limiting |	Prevent abuse or DDOS
Auth check	|  For protected routes
 */
