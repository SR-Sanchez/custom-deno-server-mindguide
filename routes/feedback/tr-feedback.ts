// import { Context } from "../_types.ts";
import { badRequest, internalServerError } from "../_utils.ts";
import {run, trFeedbackConfiguration, trFeedbackModel} from './_utils.ts'

export function OPTIONS(){
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
    }
  });
}

/* export function GET(context: Context) {
  const { query, req, } = context;
  return { message: req}
}
 */

export async function POST(context: Request) {
  const { message } = await context.json()
  if(!message) return badRequest("- Message is required")
  try {
    const aiAnswer = await run(message, trFeedbackModel, trFeedbackConfiguration);

    return new Response(JSON.stringify({
      aiResponse: aiAnswer
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("Error in POST request:", error);
    return internalServerError('Error with Gemini API')
  }
}