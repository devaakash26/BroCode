// JSON Schemas for the AI structured outputs.
//
// Kept in the subset that BOTH providers accept:
//   - Groq  -> response_format.json_schema
//   - Gemini -> generationConfig.responseSchema
// i.e. object / array / string / boolean / number, plus `enum`, `properties`,
// `items`, `required`. We intentionally avoid `additionalProperties` (Gemini
// rejects it). Outputs are still normalized in analyze.js, so treat these as
// strong guidance rather than a hard guarantee.

// Pass 1 — Groq fast pre-analysis of the submitted code.
export const PRE_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    approachSummary: { type: "string" },
    detectedAlgorithm: { type: "string" },
    correctnessRisk: { type: "string", enum: ["low", "medium", "high"] },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["info", "warning", "error"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["severity", "title", "detail"],
      },
    },
    candidateTimeComplexity: { type: "string" },
    candidateSpaceComplexity: { type: "string" },
    edgeCasesToWatch: { type: "array", items: { type: "string" } },
  },
  required: [
    "approachSummary",
    "detectedAlgorithm",
    "correctnessRisk",
    "issues",
    "candidateTimeComplexity",
    "candidateSpaceComplexity",
    "edgeCasesToWatch",
  ],
};

// Pass 2 — Gemini deep review, enhancements, and suggested test cases.
export const ENHANCEMENT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    enhancements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          impact: {
            type: "string",
            enum: ["correctness", "performance", "memory", "readability", "style"],
          },
          why: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["title", "impact", "why", "suggestion"],
      },
    },
    optimalApproach: {
      type: "object",
      properties: {
        summary: { type: "string" },
        timeComplexity: { type: "string" },
        spaceComplexity: { type: "string" },
      },
      required: ["summary", "timeComplexity", "spaceComplexity"],
    },
    suggestedTestCases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          input: { type: "string" },
          expectedOutput: { type: "string" },
          category: {
            type: "string",
            enum: ["typical", "edge", "boundary", "large", "adversarial"],
          },
          rationale: { type: "string" },
        },
        required: ["input", "expectedOutput", "category", "rationale"],
      },
    },
  },
  required: ["verdict", "strengths", "enhancements", "optimalApproach", "suggestedTestCases"],
};

// Time/space complexity analysis of the submitted code (powers the graph).
export const COMPLEXITY_SCHEMA = {
  type: "object",
  properties: {
    time: {
      type: "object",
      properties: {
        bigO: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["bigO", "explanation"],
    },
    space: {
      type: "object",
      properties: {
        bigO: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["bigO", "explanation"],
    },
    dominantOperation: { type: "string" },
    optimal: {
      type: "object",
      properties: {
        time: { type: "string" },
        space: { type: "string" },
        note: { type: "string" },
      },
      required: ["time", "space", "note"],
    },
    verdict: {
      type: "string",
      enum: ["optimal", "near-optimal", "suboptimal", "unknown"],
    },
  },
  required: ["time", "space", "dominantOperation", "optimal", "verdict"],
};
