import { advantageConfigBaseUrl, advantageConfigToken } from "./env";

export function advantageAuthHeaders(): HeadersInit {
  const t = advantageConfigToken();
  const h: Record<string, string> = {
    Accept: "application/json",
  };
  if (t) {
    h.token = `${t}`;
  }
  return h;
}

export async function advantageFetchJson(pathOrUrl: string): Promise<unknown> {
  const base = advantageConfigBaseUrl();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  const res = await fetch(url, { headers: advantageAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Advantage API ${res.status} ${res.statusText}: ${url}`);
  }
  return res.json();
}
