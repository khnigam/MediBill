import type { BlockSchema, ExternalDatasourcesConfig, SchemaDoc } from "../config-form/types";
import {
  CONFIG_INHERITANCE_CUSTOM,
  CONFIG_SCOPE_BLOCK_ID,
  CONFIG_SCOPE_INHERITANCE_KEY,
} from "../config-form/programFormLogic";
import { advantageConfigBaseUrl } from "./env";
import { advantageFetchJson } from "./http";

const OPTIONS_PATH = "/appreciation_config/options";

let bundlePromise: Promise<unknown> | null = null;

/** Single-flight fetch of the options document (schema + lists). */
export function loadAdvantageOptionsBundle(): Promise<unknown> {
  if (!bundlePromise) {
    bundlePromise = advantageFetchJson(OPTIONS_PATH);
  }
  return bundlePromise;
}

export function resetAdvantageOptionsBundle(): void {
  bundlePromise = null;
}

function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push(item);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.name === "string") {
        out.push(o.name);
        continue;
      }
      if (typeof o.label === "string") {
        out.push(o.label);
        continue;
      }
      if (typeof o.value === "string") {
        out.push(o.value);
        continue;
      }
      for (const v of Object.values(o)) {
        if (typeof v === "string" && v.trim()) {
          out.push(v.trim());
          break;
        }
      }
    }
  }
  return out;
}

/**
 * API returns `categories` as `{ "24": "Category 1", ... }` — turn into sorted label list for &lt;select&gt;.
 * If it is already a string array, pass through.
 */
function categoriesToSelectOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return toStringList(raw);
  }
  if (!raw || typeof raw !== "object") {
    return [];
  }
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([id, v]) => ({ id, label: String(v).trim() }));
  entries.sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) {
      return na - nb;
    }
    return a.id.localeCompare(b.id);
  });
  // Value stored is full string so id is preserved for saves like POST /upsert.
  return entries.map(({ id, label }) => `${id} — ${label}`);
}

/** Lists keyed like schema `options.source`: categories, user_attributes, user_profile_attributes. */
export function getAdvantageListSource(bundle: unknown, source: string): string[] {
  if (!bundle || typeof bundle !== "object") return [];
  const o = bundle as Record<string, unknown>;
  const key = source.toLowerCase();

  if (key === "categories") {
    return categoriesToSelectOptions(o.categories);
  }

  const raw = o[key] ?? o[source];
  return toStringList(raw);
}

function buildExternalDatasources(): ExternalDatasourcesConfig {
  const base = advantageConfigBaseUrl();
  return {
    options_bundle_url: `${base}${OPTIONS_PATH}`,
    user_search_url_template: `${base}/appreciation_config/get_users_details?search={query}`,
    use_backend_proxy: false,
    user_results_path: "users",
    user_id_field: "id",
    user_display_fields: ["full_name", "email"],
    source_key_map: {
      categories: "categories",
      user_attributes: "user_attributes",
      user_profile_attributes: "user_profile_attributes",
      config_options: "config_options",
    },
  };
}

/**
 * Pulls `blocks` from `sections.blocks` (codetest shape) or a legacy `sections` array.
 */
function extractBlocksFromOptionsPayload(o: Record<string, unknown>): BlockSchema[] {
  const sections = o.sections;
  if (Array.isArray(sections)) {
    return sections as BlockSchema[];
  }
  if (sections && typeof sections === "object" && !Array.isArray(sections)) {
    const inner = (sections as Record<string, unknown>).blocks;
    if (Array.isArray(inner)) {
      return inner as BlockSchema[];
    }
  }
  return [];
}

function buildConfigScopeBlock(): BlockSchema {
  return {
    block_id: CONFIG_SCOPE_BLOCK_ID,
    title: "Configuration scope",
    description:
      "Controls which blocks appear for Corporate/Category vs Custom (see config_scope_visibility on each block in options JSON).",
    layout: { columns: 1 },
    config_scope_visibility: "always",
    fields: [
      {
        key: CONFIG_SCOPE_INHERITANCE_KEY,
        label: "Award configuration follows",
        type: "select",
        required: true,
        options: { source: "config_options" },
        default: CONFIG_INHERITANCE_CUSTOM,
        placeholder: "Select…",
        ui: { width: "full" },
      },
    ],
  };
}

/**
 * Maps codetest `/appreciation_config/options` into {@link SchemaDoc}:
 * - `sections.blocks` → `blocks`
 * - Prepends {@link CONFIG_SCOPE_BLOCK_ID} unless the API already defines it (select options from root {@code config_options})
 * - `categories` object id → label → select strings
 * - `user_attributes` / `user_profile_attributes` string arrays → select options
 */
export function advantageOptionsToSchemaDoc(raw: unknown): SchemaDoc {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const apiBlocks = extractBlocksFromOptionsPayload(o);
  const blocks = apiBlocks.some((b) => b.block_id === CONFIG_SCOPE_BLOCK_ID)
    ? apiBlocks
    : [buildConfigScopeBlock(), ...apiBlocks];
  return {
    blocks,
    external_datasources: buildExternalDatasources(),
  };
}
