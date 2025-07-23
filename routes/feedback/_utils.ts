import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { GenerativeModel, GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { fetchWithHandler } from "../../utils/fetchWithHandler.ts";
import { listeningInstructions, trFeedbackInstructions, easyToneInstructions, moderateInstructions, bluntInstructions } from "./_statics.ts";
import { TRFeedbackResponse } from "./_types.ts";


const apiKey = Deno.env.get("API_KEY");
const anonymizerURL = Deno.env.get("ANONYMIZER_SERVER")

// Initialize the Google AI client
if (!apiKey) {
  throw new Error("API_KEY environment variable is not set");
}
const genAI = new GoogleGenerativeAI(apiKey);

export const trFeedbackModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: trFeedbackInstructions
});

export const listeningToneModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  systemInstruction: listeningInstructions
})

export const easyToneModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  systemInstruction: easyToneInstructions
})

export const moderateToneModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  systemInstruction: moderateInstructions
})

export const bluntToneModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  systemInstruction: bluntInstructions
})

export const functionModelMap = {
  listeningToneModel,
  easyToneModel,
  moderateToneModel,
  bluntToneModel
}


export async function run(msg: string, model: GenerativeModel, generationConfig: any = null) {

  try {
    const contents = {
      role: "user",
      parts: [{text: msg}]
    }
    const request = {
      contents,
      generationConfig,
    };
    const result = await model.generateContent(request);
    const response = result.response;
    if (response && response.text) {
      try {
        // Attempt to parse the JSON string to have an actual Json in the front not just a string
        return {
          data: JSON.parse(response.text()) as TRFeedbackResponse,
          error: null
        }
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError); //This shouldn't happen
        return response.text(); // But just in case
      }
    } else {
      throw new Error("No text response received from the model.");
    }
  } catch (error) {
    console.error("Failed to generate tr-feedback:", error);
    return {
      data: null,
      error: `Failed to generate tr-feedback: ${error.message}`
    };
  }
}


export async function chat(
  chatHistory: { role: "user" | "model", text: string }[], 
  model: GenerativeModel, 
  generationConfig: any = null
){

  try {
    const contents = chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));
    const request = {
      contents,
      generationConfig,
    };
    const result = await model.generateContent(request);
    const response = result.response;
    if (response && response.text) {
      return {
        data: response.text(),
        error: null
      }
    } else {
      throw new Error("No text response received from the model.");
    }
  } catch (error) {
    console.error("Error generating content from AI chat:", error);
    return {
      data: null,
      error: `"Error generating content from AI chat: ${error.message}`
    }
  }
}

export const getAnonymizedText = async(message: string) => {
  const {data, error} = await fetchWithHandler(anonymizerURL as string, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({text: message})
  })
  return {data, error}
}
