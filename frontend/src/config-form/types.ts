/** Root-level remote APIs for Advantage (or similar); see program-form-schema.json. */
export type ExternalDatasourcesConfig = {
  options_bundle_url?: string;
  user_search_url_template?: string;
  use_backend_proxy?: boolean;
  user_results_path?: string;
  user_id_field?: string;
  user_display_fields?: string[];
  /** Maps schema datasource `source` → JSON key on the options bundle response. */
  source_key_map?: Record<string, string>;
};

export type SchemaDoc = {
  blocks: BlockSchema[];
  external_datasources?: ExternalDatasourcesConfig;
};

export type BlockSchema = {
  block_id: string;
  title: string;
  description?: string;
  layout?: { columns?: number };
  fields: FieldSchema[];
};

export type ConditionSpec = {
  field: string;
  equals: unknown;
};

export type FieldSchema = {
  key: string;
  label?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  default?: unknown;
  validation?: {
    min_length?: number;
    max_length?: number;
  };
  ui?: {
    width?: "full" | "half";
    position?: string;
    /** When true, field is not rendered in the grid; consumed by another control (e.g. rule_builder). */
    embedded_in_rule_builder?: boolean;
  };
  /** Select: string[] or `{ source }`. Multi-select search: optional `search_url_template` etc. in `userSearchConfig.ts`. */
  options?: string[] | Record<string, unknown>;
  visible_if?: ConditionSpec;
  depends_on?: ConditionSpec;
  config?: Record<string, unknown>;
  rule_schema?: FieldSchema[];
  fields?: FieldSchema[];
  max_size_mb?: number;
  multiple?: boolean;
};

export type RuleCondition = Record<string, unknown>;

export type RuleGroup = {
  conditions: RuleCondition[];
};

export type UserOption = { id: string; label: string };

export type DataSources = {
  categories: string[];
  users: (query: string) => Promise<UserOption[]>;
  user_attributes: string[];
  user_profile_attributes: string[];
};

/** blockId → fieldKey → value (nested objects for `group` fields). */
export type FormState = Record<string, Record<string, unknown>>;
