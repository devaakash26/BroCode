import axios from "axios";
import {
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_MODEL,
  isGroqConfigured,
} from "./config";
import { parseJsonLoose } from "./util";

async function postChat(body, signal) {
  const { data } = await axios.post(`${GROQ_BASE_URL}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
    signal,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return parseJsonLoose(content);
}
export async function groqJson({
  system,
  user,
  schema,
  schemaName = "analysis",
  model = GROQ_MODEL,
  temperature = 0.2,
  maxTokens = 2048,
  signal,
}) {
  if (!isGroqConfigured()) throw new Error("Groq is not configured");

  const base = {
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  try {
    return await postChat(
      {
        ...base,
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: false, schema },
        },
      },
      signal,
    );
  } catch (err) {
    const status = err?.response?.status;
    if (status >= 400 && status < 500) {
      return await postChat(
        { ...base, response_format: { type: "json_object" } },
        signal,
      );
    }
    throw err;
  }
}
