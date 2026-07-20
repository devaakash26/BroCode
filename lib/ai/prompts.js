const MAX_CODE_CHARS = 8000;
const MAX_DESC_CHARS = 4000;

function trim(str, max) {
  if (!str) return "";
  const s = String(str);
  return s.length > max ? s.slice(0, max) + "\n...[truncated]" : s;
}

// Compact problem context shared by both passes.
function problemContext(problem) {
  const parts = [`Title: ${problem.title}`, `Difficulty: ${problem.difficulty}`];
  if (problem.description) parts.push(`Description:\n${trim(problem.description, MAX_DESC_CHARS)}`);
  if (problem.constraints) parts.push(`Constraints:\n${trim(problem.constraints, 1500)}`);
  if (problem.exampleInput) parts.push(`Example input:\n${trim(problem.exampleInput, 800)}`);
  if (problem.exampleOutput) parts.push(`Example output:\n${trim(problem.exampleOutput, 800)}`);
  if (Array.isArray(problem.tags) && problem.tags.length) {
    parts.push(`Tags: ${problem.tags.join(", ")}`);
  }
  return parts.join("\n");
}

export const GROQ_SYSTEM =
  "You are a senior competitive-programming reviewer. Analyze a candidate's " +
  "solution quickly and precisely. Judge correctness against the PROBLEM, not " +
  "against style preferences. Report Big-O using standard notation such as " +
  "O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n). Respond ONLY with JSON " +
  "matching the provided schema.";

export function buildGroqAnalysisPrompt(problem, code, language) {
  return (
    `PROBLEM:\n${problemContext(problem)}\n\n` +
    `CANDIDATE ${String(language).toUpperCase()} CODE:\n` +
    "```" +
    `${language}\n${trim(code, MAX_CODE_CHARS)}\n` +
    "```\n\n" +
    "Analyze the code: summarize the approach, name the core algorithm/data " +
    "structure, rate correctness risk, list concrete issues (bugs, missing edge " +
    "cases, risky assumptions), and estimate time and space complexity. Be " +
    "specific and terse."
  );
}

export const GEMINI_SYSTEM =
  "You are an expert software engineer and competitive-programming coach. Given " +
  "a problem, a candidate's solution, and a fast first-pass analysis, produce a " +
  "high-quality review: an overall verdict, genuine strengths, concrete " +
  "enhancements (each with a reason and a specific suggestion), the optimal " +
  "approach with its complexity, and a set of high-value test cases (typical, " +
  "edge, boundary, large, adversarial) with exact expected outputs that match " +
  "the problem's I/O format. Only propose test-case inputs that satisfy the " +
  "stated constraints. Respond ONLY with JSON matching the provided schema.";

export function buildGeminiEnhancementPrompt(problem, code, language, groqAnalysis) {
  const priorPass = groqAnalysis
    ? `FAST FIRST-PASS ANALYSIS (from a quick model — verify, don't trust blindly):\n${JSON.stringify(
        groqAnalysis,
      )}`
    : "FAST FIRST-PASS ANALYSIS: (unavailable)";

  const referenceComplexity = problem.timeComplexity
    ? `Known optimal complexity for this problem — time: ${problem.timeComplexity}` +
      `${problem.spaceComplexity ? `, space: ${problem.spaceComplexity}` : ""}.`
    : "";

  return (
    `PROBLEM:\n${problemContext(problem)}\n${referenceComplexity}\n\n` +
    `${priorPass}\n\n` +
    `CANDIDATE ${String(language).toUpperCase()} CODE:\n` +
    "```" +
    `${language}\n${trim(code, MAX_CODE_CHARS)}\n` +
    "```\n\n" +
    "Produce the review. For suggestedTestCases give 4-6 cases where 'input' and " +
    "'expectedOutput' are plain strings in the SAME stdin/stdout format the " +
    "problem uses; prioritize edge/boundary/adversarial cases a naive solution " +
    "would fail. Keep every field concise."
  );
}

export const COMPLEXITY_SYSTEM =
  "You are an expert at algorithmic complexity analysis. Given a problem and a " +
  "candidate's code, determine the TIME and SPACE complexity of THIS code (not " +
  "the optimal solution), using standard Big-O notation such as O(1), O(log n), " +
  "O(n), O(n log n), O(n^2), O(2^n), O(n!). Use 'n' as the primary input size. " +
  "Identify the dominant operation driving the time cost. Then state the optimal " +
  "complexity for the problem and judge whether the candidate's solution is " +
  "optimal, near-optimal, or suboptimal. Respond ONLY with JSON matching the schema.";

export function buildComplexityPrompt(problem, code, language) {
  const known = problem.timeComplexity
    ? `The known optimal complexity for this problem is time ${problem.timeComplexity}` +
      `${problem.spaceComplexity ? `, space ${problem.spaceComplexity}` : ""}.`
    : "";
  return (
    `PROBLEM:\n${problemContext(problem)}\n${known}\n\n` +
    `CANDIDATE ${String(language).toUpperCase()} CODE:\n` +
    "```" +
    `${language}\n${trim(code, MAX_CODE_CHARS)}\n` +
    "```\n\n" +
    "Analyze the complexity of THIS code. Keep each explanation to one or two " +
    "sentences. If the code is incomplete or incorrect, still give your best " +
    "complexity estimate for what is written, and use verdict \"unknown\" if you " +
    "genuinely cannot tell."
  );
}
