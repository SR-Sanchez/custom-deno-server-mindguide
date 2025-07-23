import { testingResponse } from "../_utils.ts";

export function GET() {
  return testingResponse();
}

export function POST() {
  return new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
}