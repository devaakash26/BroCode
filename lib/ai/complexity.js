import crypto from "crypto";
import { cache } from "@/lib/redis";
import { groqJson } from "./groq";
import { geminiJson } from "./gemini";
import { COMPLEXITY_SCHEMA } from "./schemas";
import { COMPLEXITY_SYSTEM, buildComplexityPrompt } from "./prompts";
import {
  GROQ_MODEL,
  GEMINI_MODEL,
  AI_CACHE_TTL,
  isGroqConfigured,
  isGeminiConfigured,
  isAiConfigured,
} from "./config";
import { asStr, oneOf } from "./util";

function cacheKey(problemId, language, code) {
  // Include the model names so switching GROQ_MODEL/GEMINI_MODEL (e.g. after a
  // deprecation) invalidates old cached results instead of serving stale errors.
  const hash = crypto
    .createHash("sha1")
    .update(`${GROQ_MODEL}::${GEMINI_MODEL}::${problemId}::${language}::${code}`)
    .digest("hex");
  return `brocode-ai-complexity-${hash}`;
}

function normalize(x) {
  if (!x || typeof x !== "object") return null;
  const obj = (o) => (o && typeof o === "object" ? o : {});
  return {
    time: {
      bigO: asStr(obj(x.time).bigO),
      explanation: asStr(obj(x.time).explanation),
    },
    space: {
      bigO: asStr(obj(x.space).bigO),
      explanation: asStr(obj(x.space).explanation),
    },
    dominantOperation: asStr(x.dominantOperation),
    optimal: {
      time: asStr(obj(x.optimal).time),
      space: asStr(obj(x.optimal).space),
      note: asStr(obj(x.optimal).note),
    },
    verdict: oneOf(x.verdict, ["optimal", "near-optimal", "suboptimal", "unknown"], "unknown"),
  };
}

/**
 * Determine the submitted code's time/space complexity. Prefers Gemini for
 * reasoning quality and falls back to Groq for availability. Cached by code
 * hash. Never throws for provider failures — returns a renderable object.
 */
export async function analyzeComplexity({ problem, code, language, signal, useCache = true }) {
  if (!isAiConfigured()) {
    return { available: false, reason: "AI analysis is not configured." };
  }

  const key = cacheKey(problem.id, language, code);
  if (useCache) {
    const cached = await cache.get(key);
    if (cached) return { ...cached, cached: true };
  }

  const system = COMPLEXITY_SYSTEM;
  const user = buildComplexityPrompt(problem, code, language);

  let complexity = null;
  let error = null;
  let provider = null;

  if (isGeminiConfigured()) {
    try {
      complexity = normalize(await geminiJson({ system, user, schema: COMPLEXITY_SCHEMA, signal }));
      provider = "gemini";
    } catch (err) {
      error = err?.message || "Gemini complexity analysis failed";
    }
  }
  if (!complexity && isGroqConfigured()) {
    try {
      complexity = normalize(
        await groqJson({ system, user, schema: COMPLEXITY_SCHEMA, schemaName: "complexity", signal }),
      );
      provider = "groq";
      error = null;
    } catch (err) {
      error = err?.message || "Groq complexity analysis failed";
    }
  }

  const result = {
    available: true,
    cached: false,
    generatedAt: new Date().toISOString(),
    provider,
    model: provider === "gemini" ? GEMINI_MODEL : provider === "groq" ? GROQ_MODEL : null,
    // The problem's stored reference complexity — used as a fallback "optimal"
    // curve on the graph when the model doesn't return one.
    reference: {
      time: problem.timeComplexity || null,
      space: problem.spaceComplexity || null,
    },
    complexity,
    error: complexity ? null : error,
  };

  if (useCache && complexity) {
    await cache.set(key, result, AI_CACHE_TTL);
  }
  return result;
}
