export interface TRFeedbackResponse {
	success: boolean;
	data:    Data;
}

export interface Data {
	alternative_thought_analysis: Analysis;
	emotion_consistency_check:    string;
	evidence_analysis:            Analysis;
	general_feedback:             string;
}

export interface Analysis {
	feedback: string;
}

export type ChatHistoryResponse = {
	chatHistory: ChatHistory
}

export type ChatHistory =  RoleInput[];

export interface RoleInput {
	role: "user" | "model";
	text: string;
}

