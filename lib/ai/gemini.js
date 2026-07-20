import axios from "axios";
import {
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
  isGeminiConfigured,
} from "./config";
import { parseJsonLoose } from "./util";

async function generate(model, body, signal) {
  const { data } = await axios.post(
    `${GEMINI_BASE_URL}/models/${model}:generateContent`,
    body,
    {
      headers: {
        "x-goog-api-key": GEMINI_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 45000,
      signal,
    },
  );
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("");
  if (!text) throw new Error("Gemini returned an empty response");
  return parseJsonLoose(text);
}

export async function geminiJson({
  system,
  user,
  schema,
  model = GEMINI_MODEL,
  temperature = 0.3,
  maxTokens = 8192,
  signal,
}) {
  if (!isGeminiConfigured()) throw new Error("Gemini is not configured");

  const generationConfig = {
    temperature,
    maxOutputTokens: maxTokens,
    responseMimeType: "application/json",
    ...(schema ? { responseSchema: schema } : {}),
  };
  const body = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig,
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  // Wraps a single attempt with the schema->no-schema fallback for 4xx errors.
  const attempt = async (attemptModel) => {
    try {
      return await generate(attemptModel, body, signal);
    } catch (err) {
      const status = err?.response?.status;
      if (schema && status >= 400 && status < 500) {
        const { responseSchema, ...noSchema } = generationConfig;
        return await generate(attemptModel, { ...body, generationConfig: noSchema }, signal);
      }
      throw err;
    }
  };

  try {
    return await attempt(model);
  } catch (err) {
    if (err?.response?.status !== 503) throw err;
    // Gemini returns 503 UNAVAILABLE on transient demand spikes — retry the
    // same model once, then fall back to a lighter model if still saturated.
    try {
      await new Promise((r) => setTimeout(r, 1500));
      return await attempt(model);
    } catch (retryErr) {
      if (retryErr?.response?.status !== 503 || model === GEMINI_FALLBACK_MODEL) throw retryErr;
      return await attempt(GEMINI_FALLBACK_MODEL);
    }
  }
}
