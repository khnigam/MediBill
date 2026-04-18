import type { SchemaDoc } from "./types";

const API_BASE = "http://localhost:8080";

export async function fetchProgramFormSchema(): Promise<SchemaDoc> {
  const res = await fetch(`${API_BASE}/api/program-form/schema`);
  if (!res.ok) {
    throw new Error(`Failed to load program form schema (${res.status})`);
  }
  return res.json() as Promise<SchemaDoc>;
}

export async function fetchDatasourceList(source: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/api/program-form/datasources/${encodeURIComponent(source)}`
  );
  if (!res.ok) {
    throw new Error(`Datasource "${source}" failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as string[]) : [];
}

const datasourceCache = new Map<string, Promise<string[]>>();

/** Dedupes concurrent requests for the same static list (categories, attributes, …). */
export function getDatasourceCached(source: string): Promise<string[]> {
  const hit = datasourceCache.get(source);
  if (hit) return hit;
  const p = fetchDatasourceList(source);
  datasourceCache.set(source, p);
  return p;
}

export type UserSearchHit = { id: string; label: string };

export async function searchUsers(query: string): Promise<UserSearchHit[]> {
  const q = encodeURIComponent(query.trim());
  const res = await fetch(`${API_BASE}/api/program-form/users/search?q=${q}`);
  if (!res.ok) {
    throw new Error(`User search failed (${res.status})`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row) => ({
    id: String((row as { id?: unknown }).id ?? ""),
    label: String((row as { label?: unknown }).label ?? ""),
  }));
}
