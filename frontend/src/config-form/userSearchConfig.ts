import type { ExternalDatasourcesConfig } from "./types";

/**
 * Declarative remote user search for {@code multi_select_search} (schema {@code options} object).
 * Use {@code use_backend_proxy} for third-party APIs so the browser avoids CORS (MediBill backend allowlists hosts).
 */
export type RemoteUserSearchOptions = {
  source?: string;
  /**
   * Full URL with literal placeholder {@code {query}} or {@code {q}} for the typed search string (URL-encoded).
   * Example: https://example.com/api/users?search={query}
   */
  search_url_template?: string;
  /** Dot path to the array of user objects in the JSON response (default {@code users}). */
  results_path?: string;
  /** Field on each user object used as the stored id (default {@code id}). */
  id_field?: string;
  /** Keys to concatenate for the dropdown label (default full_name + email). */
  display_fields?: string[];
  /** When true, call MediBill {@code POST /api/program-form/users/search-proxy} (required for most external origins). */
  use_backend_proxy?: boolean;
};

function parseFieldOnlyRemote(options: unknown): RemoteUserSearchOptions | null {
  if (!options || typeof options !== "object" || Array.isArray(options)) return null;
  const o = options as Record<string, unknown>;
  if (typeof o.search_url_template === "string" && o.search_url_template.trim()) {
    return o as unknown as RemoteUserSearchOptions;
  }
  return null;
}

/**
 * Resolves remote user search: per-field {@code search_url_template} wins; else {@code source: "users"}}
 * + root {@code external_datasources} from the program schema.
 */
export function parseRemoteUserSearchOptions(
  options: unknown,
  external: ExternalDatasourcesConfig | null | undefined
): RemoteUserSearchOptions | null {
  const fromField = parseFieldOnlyRemote(options);
  if (fromField) {
    const proxy =
      fromField.use_backend_proxy ?? external?.use_backend_proxy !== false;
    return { ...fromField, use_backend_proxy: proxy };
  }

  const o = options as Record<string, unknown> | null;
  const src = o && typeof o.source === "string" ? o.source : "";
  const tmpl = external?.user_search_url_template?.trim();
  if (src === "users" && tmpl) {
    return {
      source: "users",
      search_url_template: tmpl,
      results_path: external?.user_results_path ?? "users",
      id_field: external?.user_id_field ?? "id",
      display_fields:
        Array.isArray(external?.user_display_fields) && external.user_display_fields.length
          ? external.user_display_fields.map(String)
          : ["full_name", "email"],
      use_backend_proxy: external?.use_backend_proxy !== false,
    };
  }
  return null;
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function formatLabel(row: Record<string, unknown>, displayFields: string[]): string {
  const parts: string[] = [];
  for (const k of displayFields) {
    const v = row[k];
    if (v == null || v === "") continue;
    parts.push(String(v).trim());
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function normalizeUserSearchRows(
  payload: unknown,
  cfg: RemoteUserSearchOptions
): { id: string; label: string }[] {
  const resultsPath = cfg.results_path?.trim() || "users";
  const idField = cfg.id_field?.trim() || "id";
  const displayFields =
    Array.isArray(cfg.display_fields) && cfg.display_fields.length
      ? cfg.display_fields.map(String)
      : ["full_name", "email"];

  const arr = getAtPath(payload, resultsPath);
  if (!Array.isArray(arr)) return [];

  const out: { id: string; label: string }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const idVal = row[idField];
    if (idVal == null || idVal === "") continue;
    out.push({
      id: String(idVal),
      label: formatLabel(row, displayFields),
    });
  }
  return out;
}
