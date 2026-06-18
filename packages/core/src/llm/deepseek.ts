import OpenAI from "openai";
import type { LlmClient } from "../types.js";

/**
 * Creates a DeepSeek LLM client using the OpenAI-compatible API.
 * Reads DEEPSEEK_API_KEY from environment variables.
 */
export function createDeepSeekClient(): LlmClient {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not found. Set it in your environment or .env file.\n" +
        "Get one at https://platform.deepseek.com"
    );
  }

  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey,
  });

  return {
    async chat(messages) {
      const response = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: messages.map((m) => ({
          role: m.role as "system" | "user",
          content: m.content,
        })),
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("DeepSeek returned an empty response.");
      }
      return content;
    },
  };
}

/**
 * Default client instance (lazy-initialized).
 */
let _defaultClient: LlmClient | null = null;

export function getDeepSeekClient(): LlmClient {
  if (!_defaultClient) {
    _defaultClient = createDeepSeekClient();
  }
  return _defaultClient;
}
