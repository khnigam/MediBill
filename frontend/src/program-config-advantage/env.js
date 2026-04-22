const DEFAULT_BASE = "https://codetest.advantageclub.co";
const HARDCODED_ADVANTAGE_TOKEN = "c64aae47a5457e330eeed0363ba976f58781b7f1";
function advantageConfigBaseUrl() {
  return (process.env.REACT_APP_ADVANTAGE_CONFIG_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}
function advantageConfigToken() {
  const fromEnv = (process.env.REACT_APP_ADVANTAGE_CONFIG_TOKEN || process.env.REACT_APP_ADVANTAGE_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  return HARDCODED_ADVANTAGE_TOKEN;
}
export {
  advantageConfigBaseUrl,
  advantageConfigToken
};
