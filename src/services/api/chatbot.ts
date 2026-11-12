import { api } from "./client";

export type ChatTopic = "price" | "hours" | "availability" | "cancel" | "address" | "payment";
/** The server answers with a message key plus the live data to fill it in. */
export type ChatAnswer = {
  topic: ChatTopic | "fallback";
  lines: Array<{ key: string; params?: Record<string, string | number> }>;
};

export const chatbotApi = {
  ask: (input: { topic?: ChatTopic; text?: string }) => api<ChatAnswer>("/api/chatbot/ask", { method: "POST", body: input }),
};
