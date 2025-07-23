import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { badRequest, internalServerError, returnSuccess } from "../../_utils.ts";
import {chat, getAnonymizedText, functionModelMap  } from '../_utils.ts'
import { RouteContext } from "../../_types.ts";
import { ChatHistory, ChatHistoryResponse, RoleInput } from "../_types.ts";



const HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Content-Type': 'application/json'
}

export function OPTIONS(){
	return returnSuccess(null, 200, HEADERS)
}

const getGeminiFeedback = async(chatHistory: ChatHistory, model: any) => {
	try {
		const {data, error} = await chat(chatHistory, model);
		return {data, error}
	} catch (error) {
		return {
			data: null,
			error: `Error getting chat response from Gemini: ${error}`
		}
	}
}


const validateRequest = (chatHistory: ChatHistory, model: any, lastMsgObj: RoleInput | undefined) => {
	if(!chatHistory || chatHistory.length === 0){
		return "chat history is required"
	} else if(!model) {
		return "chosen model doesn't exist"
	} else if(!lastMsgObj || typeof lastMsgObj.text !== "string" || !lastMsgObj.text ) {
		return "last message is missing or invalid"
	}
	return null
}

export async function POST(context: RouteContext) {
	try {
		const { chatHistory } = await context.json() as ChatHistoryResponse
		const modelName = context.params.model
		const model = functionModelMap[modelName]
		const lastMsgObj = chatHistory.at(-1);
		const isRequestInvalid = validateRequest(chatHistory, model, lastMsgObj)
		if(isRequestInvalid)return badRequest(isRequestInvalid)
		const lastMsg = lastMsgObj!.text;
		const {data, error} = await getAnonymizedText(lastMsg);
		if(error) throw Error (`Error with anonymizing function ${error}`)
		lastMsgObj!.text = (data as { anonymized_text: string }).anonymized_text;
		const {data: geminiData, error: geminiError } = await getGeminiFeedback(chatHistory, model)
		if(geminiError) throw Error(geminiError)
		return returnSuccess(geminiData, 200, HEADERS)
	} catch (error) {
		console.error(error)
		return internalServerError(error.message)
	}
}