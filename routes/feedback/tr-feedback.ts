// import { Context } from "../_types.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { badRequest, internalServerError, returnSuccess } from "../_utils.ts";
import {getAnonymizedText, run, trFeedbackModel} from './_utils.ts'
import { RouteContext } from "../_types.ts";
import { trFeedbackConfiguration } from "./_statics.ts";

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

export function OPTIONS(){
  return returnSuccess(null, 200, HEADERS)
}

const getGeminiFeedback = async(message: any) => {
  try {
    const {data, error} = await run(message, trFeedbackModel, trFeedbackConfiguration);
    return {data, error}
  } catch (error) {
    return {
      data: null,
      error: `Error getting tr-feedback response from Gemini: ${error}`
    }
  }
}

export async function POST(context: RouteContext) {
  try {
    const { message } = await context.json() as { message: string }
    if(!message) return badRequest("- Message is required")
    const {data, error} = await getAnonymizedText(message);
    if(error) throw Error (`Error with anonymizing function ${error}`)
    const anonymized_text = (data as { anonymized_text: string }).anonymized_text;
    const {data: geminiData, error: geminiError } = await getGeminiFeedback(anonymized_text)
    if(geminiError) throw Error(geminiError)
    return returnSuccess(geminiData, 200, HEADERS)
  } catch (error) {
    console.error(error)
    return internalServerError(error.message)
  }
}
