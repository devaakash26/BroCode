import crypto from "crypto";
import { cache } from "@/lib/redis";
import { groqJson } from "./groq";
import { geminiJson } from "./gemini";
import { PRE_ANALYSIS_SCHEMA, ENHANCEMENT_SCHEMA } from "./schemas";
import {
  GROQ_SYSTEM,
  buildGroqAnalysisPrompt,
  GEMINI_SYSTEM,
  buildGeminiEnhancementPrompt,
} from "./prompts";
import {
  GROQ_MODEL,
  GEMINI_MODEL,
  AI_CACHE_TTL,
  isGroqConfigured,
  isGeminiConfigured,
  isAiConfigured,
} from "./config";
import { asStr, asArr, oneOf } from "./util";

function cacheKey(problemId, language, code) {
  const hash = crypto
    .createHash("sha1")
    .update(`${problemId}::${language}::${code}`)
    .digest("hex");
  return `brocode-ai-analyze-${hash}`;
}

function normalizePreAnalysis(x) {
  if (!x || typeof x !== "object") return null;
  return {
    approachSummary: asStr(x.approachSummary),
    detectedAlgorithm: asStr(x.detectedAlgorithm),
    correctnessRisk: oneOf(x.correctnessRisk, ["low", "medium", "high"], "medium"),
    issues: asArr(x.issues)
      .map((i) => ({
        severity: oneOf(i?.severity, ["info", "warning", "error"], "info"),
        title: asStr(i?.title),
        detail: asStr(i?.detail),
      }))
      .filter((i) => i.title),
    candidateTimeComplexity: asStr(x.candidateTimeComplexity),
    candidateSpaceComplexity: asStr(x.candidateSpaceComplexity),
    edgeCasesToWatch: asArr(x.edgeCasesToWatch).map(asStr).filter(Boolean),
  };
}

function normalizeEnhancement(x) {
  if (!x || typeof x !== "object") return null;
  const impacts = ["correctness", "performance", "memory", "readability", "style"];
  const categories = ["typical", "edge", "boundary", "large", "adversarial"];
  return {
    verdict: asStr(x.verdict),
    strengths: asArr(x.strengths).map(asStr).filter(Boolean),
    enhancements: asArr(x.enhancements)
      .map((e) => ({
        title: asStr(e?.title),
        impact: oneOf(e?.impact, impacts, "readability"),
        why: asStr(e?.why),
        suggestion: asStr(e?.suggestion),
      }))
      .filter((e) => e.title),
    optimalApproach:
      x.optimalApproach && typeof x.optimalApproach === "object"
        ? {
            summary: asStr(x.optimalApproach.summary),
            timeComplexity: asStr(x.optimalApproach.timeComplexity),
            spaceComplexity: asStr(x.optimalApproach.spaceComplexity),
          }
        : null,
    suggestedTestCases: asArr(x.suggestedTestCases)
      .map((t) => ({
        input: asStr(t?.input),
        expectedOutput: asStr(t?.expectedOutput),
        category: oneOf(t?.category, categories, "edge"),
        rationale: asStr(t?.rationale),
        // Phase 3 will verify these against the reference solution via Judge0.
        verified: false,
      }))
      .filter((t) => t.input !== ""),
  };
}

/**
 * Run the two-stage analysis: Groq (fast pre-analysis) -> Gemini (deep review +
 * suggested tests). Each stage is independently fault-tolerant: if one provider
 * fails or is unconfigured, the other still returns. Results are cached by code
 * hash. NEVER throws for provider failures — returns an object the UI can render.
 *
 * @param {object}  args.problem   Trimmed problem row (id, title, description, ...)
 * @param {string}  args.code      Submitted source
 * @param {string}  args.language  e.g. "cpp" | "python" | "java" | "javascript"
 * @param {AbortSignal} [args.signal]
 * @param {boolean} [args.useCache=true]
 */
export async function analyzeSubmission({ problem, code, language, signal, useCache = true }) {
  if (!isAiConfigured()) {
    return { available: false, reason: "AI analysis is not configured." };
  }

  const key = cacheKey(problem.id, language, code);

  if (useCache) {
    const cached = await cache.get(key);
    if (cached) return { ...cached, cached: true };
  }

  // Pass 1 — Groq fast pre-analysis. Non-fatal if it fails.
  let groq = null;
  let groqError = null;
  if (isGroqConfigured()) {
    try {
      const raw = await groqJson({
        system: GROQ_SYSTEM,
        user: buildGroqAnalysisPrompt(problem, code, language),
        schema: PRE_ANALYSIS_SCHEMA,
        schemaName: "pre_analysis",
        signal,
      });
      groq = normalizePreAnalysis(raw);
    } catch (err) {
      groqError = err?.message || "Groq analysis failed";
    }
  }

  // Pass 2 — Gemini deep review, fed Groq's pass as a (verify-don't-trust) hint.
  let gemini = null;
  let geminiError = null;
  if (isGeminiConfigured()) {
    try {
      const raw = await geminiJson({
        system: GEMINI_SYSTEM,
        user: buildGeminiEnhancementPrompt(problem, code, language, groq),
        schema: ENHANCEMENT_SCHEMA,
        signal,
      });
      gemini = normalizeEnhancement(raw);
    } catch (err) {
      geminiError = err?.message || "Gemini analysis failed";
    }
  }

  const result = {
    available: true,
    cached: false,
    generatedAt: new Date().toISOString(),
    models: {
      groq: isGroqConfigured() ? GROQ_MODEL : null,
      gemini: isGeminiConfigured() ? GEMINI_MODEL : null,
    },
    groq,
    gemini,
    errors: { groq: groqError, gemini: geminiError },
  };

  if (useCache && (groq || gemini)) {
    await cache.set(key, result, AI_CACHE_TTL);
  }

  return result;
}
