import type { SchemaDoc } from "./types";
import { advantageAuthHeaders } from "../program-config-advantage/http";
import {
  advantageOptionsToSchemaDoc,
  getAdvantageListSource,
  loadAdvantageOptionsBundle,
} from "../program-config-advantage/optionsBundle";
import {
  normalizeUserSearchRows,
  type RemoteUserSearchOptions,
} from "./userSearchConfig";

/**
 * Program configuration dashboard: **Advantage codetest only** (no MediBill `/api/program-form` Java calls).
 */

export async function fetchProgramFormSchema(): Promise<SchemaDoc> {
  const raw = await loadAdvantageOptionsBundle();
  return advantageOptionsToSchemaDoc(raw);
}

export async function fetchDatasourceList(source: string): Promise<string[]> {
  const raw = await loadAdvantageOptionsBundle();
  return getAdvantageListSource(raw, source);
}

const datasourceCache = new Map<string, Promise<string[]>>();

/** Dedupes concurrent requests for the same list key (categories, user_attributes, …). */
export function getDatasourceCached(source: string): Promise<string[]> {
  const hit = datasourceCache.get(source);
  if (hit) return hit;
  const p = fetchDatasourceList(source);
  datasourceCache.set(source, p);
  return p;
}

export type UserSearchHit = { id: string; label: string };

/** Legacy mock path unused when schema supplies Advantage user search. */
export async function searchUsers(_query: string): Promise<UserSearchHit[]> {
  return [];
}

/**
 * User directory search — direct HTTPS to codetest with the same Bearer token as options.
 */
export async function searchUsersRemote(
  query: string,
  cfg: RemoteUserSearchOptions
): Promise<UserSearchHit[]> {
  const template = cfg.search_url_template?.trim();
  if (!template) return [];

  const q = query.trim();
  const enc = encodeURIComponent(q);
  const url = template.split("{query}").join(enc).split("{q}").join(enc);
  const res = await fetch(url, { headers: advantageAuthHeaders() });
  if (!res.ok) {
    throw new Error(`User search failed (${res.status})`);
  }
  const payload = await res.json();
  return normalizeUserSearchRows(payload, cfg);
}
