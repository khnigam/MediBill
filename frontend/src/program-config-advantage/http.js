import { advantageConfigBaseUrl, advantageConfigToken } from "./env";
function advantageAuthHeaders() {
  const t = advantageConfigToken();
  const h = {
    Accept: "application/json"
  };
  if (t) {
    h.token = `${t}`;
  }
  return h;
}
function resolveAdvantageUrl(pathOrUrl) {
  const base = advantageConfigBaseUrl();
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
async function advantageFetchJson(pathOrUrl) {
  const url = resolveAdvantageUrl(pathOrUrl);
  const res = await fetch(url, { headers: advantageAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Advantage API ${res.status} ${res.statusText}: ${url}`);
  }
  return res.json();
}
async function advantagePostJson(pathOrUrl, body) {
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
    return res.json();
  }
  return null;
}
async function advantagePostMultipart(pathOrUrl, formData) {
  const url = resolveAdvantageUrl(pathOrUrl);
  const headers = new Headers(advantageAuthHeaders());
  const res = await fetch(url, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Advantage API ${res.status} ${res.statusText}: ${text.slice(0, 240) || url}`
    );
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  return null;
}
export {
  advantageAuthHeaders,
  advantageFetchJson,
  advantagePostJson,
  advantagePostMultipart
};
