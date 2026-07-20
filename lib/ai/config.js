const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const AI_ANALYSIS_ENABLED = process.env.AI_ANALYSIS_ENABLED !== "false";
const AI_CACHE_TTL = parseInt(process.env.AI_CACHE_TTL || "604800", 10);
const AI_RATE_LIMIT = parseInt(process.env.AI_RATE_LIMIT || "20", 10); // requests
const AI_RATE_WINDOW = parseInt(process.env.AI_RATE_WINDOW || "60", 10); // seconds

function isGroqConfigured() {
  return !!GROQ_API_KEY;
}

function isGeminiConfigured() {
  return !!GEMINI_API_KEY;
}
function isAiConfigured() {
  return AI_ANALYSIS_ENABLED && (isGroqConfigured() || isGeminiConfigured());
}

export {
  GROQ_API_KEY,
  GROQ_BASE_URL,
  GROQ_MODEL,
  GEMINI_API_KEY,
  GEMINI_BASE_URL,
  GEMINI_MODEL,
  AI_ANALYSIS_ENABLED,
  AI_CACHE_TTL,
  AI_RATE_LIMIT,
  AI_RATE_WINDOW,
  isGroqConfigured,
  isGeminiConfigured,
  isAiConfigured,
};
