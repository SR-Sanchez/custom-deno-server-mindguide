import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { GenerativeModel, GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
// Initialize the Google AI client
const apiKey = Deno.env.get("API_KEY");
if (!apiKey) {
  throw new Error("API_KEY environment variable is not set");
}
const genAI = new GoogleGenerativeAI(apiKey);
export const trFeedbackModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "You are a psychoeducator. I am a novice patient trying to answer a custom thought record format (very simplified). Start by giving what I have done well. Focus on  1. Evidence for and against: if I use opinions instead of facts, show me how to correct it. 2. Alternative thought: if it is not realistic of distorted, show me how to correct it. Don't suggest adding sections to the format. Don't use any jargon at all (including TCC terminology). Always respond in Spanish. Keep the answer shot (100 words or less)."
});

export const trFeedbackConfiguration = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      general_feedback: {
        type: "string"
      },
      evidence_analysis: {
        type: "object",
        properties: {
          feedback: {
            type: "string"
          }
        },
        required: [
          "feedback"
        ]
      },
      alternative_thought_analysis: {
        type: "object",
        properties: {
          feedback: {
            type: "string"
          }
        },
        required: [
          "feedback"
        ]
      },
      emotion_consistency_check: {
        type: "string"
      }
    },
    required: [
      "general_feedback",
      "evidence_analysis",
      "alternative_thought_analysis",
      "emotion_consistency_check"
    ]
  }
};

export async function run(msg: string, model: GenerativeModel, generationConfig: any) {
  try {
    const prompt = {
      text: msg
    };
    const content = {
      parts: [
        prompt
      ],
      role: "user"
    };
    const request = {
      contents: [
        content
      ],
      generationConfig: generationConfig
    };
    const result = await model.generateContent(request);
    const response = result.response;
    if (response && response.text) {
      try {
        // Attempt to parse the JSON string to have an actual Json in the front not just a string
        return JSON.parse(response.text());
      } catch (jsonError) {
        console.error("Error parsing JSON:", jsonError);
        // If parsing fails, return the string or handle as appropriate
        return response.text(); // Or throw an error
      }
    } else {
      throw new Error("No text response received from the model.");
    }
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content");
  }
}