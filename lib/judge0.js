const JUDGE0_URL = process.env.JUDGE0_URL;

/**
 * Returns auth headers for the self-hosted Judge0 instance.
 * Header names are configurable via env vars so they can be changed
 * in the dashboard without touching code.
 */
function getJudge0Headers() {
  return {
    [process.env.JUDGE0_AUTHENTICATION_HEADER]:
      process.env.JUDGE0_AUTHENTICATION_TOKEN,
    [process.env.JUDGE0_AUTHORIZATION_HEADER]:
      process.env.JUDGE0_AUTHORIZATION_TOKEN,
    "Content-Type": "application/json",
  };
}

function isJudge0Configured() {
  return !!(
    JUDGE0_URL &&
    process.env.JUDGE0_AUTHENTICATION_TOKEN &&
    process.env.JUDGE0_AUTHORIZATION_TOKEN
  );
}

export { JUDGE0_URL, getJudge0Headers, isJudge0Configured };
