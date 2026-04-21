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

function resolveAdvantageUrl(pathOrUrl: string): string {
  const base = advantageConfigBaseUrl();
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

export async function advantageFetchJson(pathOrUrl: string): Promise<unknown> {
  const url = resolveAdvantageUrl(pathOrUrl);
  const res = await fetch(url, { headers: advantageAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Advantage API ${res.status} ${res.statusText}: ${url}`);
  }
  return res.json();
}

/** POST JSON to codetest; parses JSON body when Content-Type is JSON, else returns null. */
export async function advantagePostJson(pathOrUrl: string, body: unknown): Promise<unknown> {
  const url = resolveAdvantageUrl(pathOrUrl);
  const headers = new Headers(advantageAuthHeaders());
  headers.set("Content-Type", "application/json");
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Advantage API ${res.status} ${res.statusText}: ${text.slice(0, 240) || url}`
    );
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return res.json() as Promise<unknown>;
  }
  return null;
}
