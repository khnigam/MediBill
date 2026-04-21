/**
 * Advantage codetest — no MediBill Java calls from this module.
 * Optional override: REACT_APP_ADVANTAGE_CONFIG_BASE_URL, REACT_APP_ADVANTAGE_CONFIG_TOKEN.
 */
const DEFAULT_BASE = "https://codetest.advantageclub.co";

/** Temporary hardcoded token (codetest); rotate/remove before any shared or production build. */
const HARDCODED_ADVANTAGE_TOKEN = "c64aae47a5457e330eeed0363ba976f58781b7f1";

export function advantageConfigBaseUrl(): string {
  return (process.env.REACT_APP_ADVANTAGE_CONFIG_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

/** Bearer token for codetest `Authorization` header; env wins if set. */
export function advantageConfigToken(): string {
  const fromEnv = (
    process.env.REACT_APP_ADVANTAGE_CONFIG_TOKEN ||
    process.env.REACT_APP_ADVANTAGE_TOKEN ||
    ""
  ).trim();
  if (fromEnv) return fromEnv;
  return HARDCODED_ADVANTAGE_TOKEN;
}
