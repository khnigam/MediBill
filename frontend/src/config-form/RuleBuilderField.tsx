import React, { useEffect, useMemo, useState } from "react";
import type { FieldSchema } from "./types";
import { getDatasourceCached } from "./schemaApi";
import { matchesCondition } from "./programFormLogic";

/** Stored on the `rules` field value — how Rule 01 combines with Rule 02, etc. */
type RulesJoin = "and" | "or";

type RuleRow = {
  conditions_operator: RulesJoin;
  conditions: Array<Record<string, unknown>>;
};

type RuleBuilderValue = {
  rules_join: RulesJoin;
  rules: RuleRow[];
};

function normalizeValue(raw: unknown): RuleBuilderValue {
  const v = raw as Partial<RuleBuilderValue> | null | undefined;
  const rulesJoin: RulesJoin = v?.rules_join === "or" ? "or" : "and";

  if (v && Array.isArray(v.rules) && v.rules.length > 0) {
    return {
      rules_join: rulesJoin,
      rules: v.rules.map((r) => {
        const row = r as Record<string, unknown>;
        const conditions_operator: RulesJoin =
          row.conditions_operator === "or" ? "or" : "and";
        const conditions =
          Array.isArray(row.conditions) && row.conditions.length > 0
            ? row.conditions.map((c) => ({ ...(c as Record<string, unknown>) }))
            : [{}];
        return { conditions_operator, conditions };
      }),
    };
  }
  return {
    rules_join: "and",
    rules: [{ conditions_operator: "and", conditions: [{}] }],
  };
}

function AndOrToggle({
  value,
  onChange,
  compact,
  ariaLabel,
}: {
  value: RulesJoin;
  onChange: (next: RulesJoin) => void;
  compact?: boolean;
  ariaLabel: string;
}) {
  const pad = compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs";
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 font-semibold uppercase tracking-wide text-gray-600 shadow-sm"
      role="group"
      aria-label={ariaLabel}
    >
      {(["and", "or"] as const).map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            className={`rounded-md ${pad} transition ${
              on
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RuleSchemaCell({
  col,
  row,
  onPatch,
  listOptions,
}: {
  col: FieldSchema;
  row: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
  listOptions: Record<string, string[]>;
}) {
  if (!matchesCondition(col.depends_on, row)) return null;

  const label = (col.label ?? col.key).replace(/_/g, " ");

  if (col.type === "select") {
    const raw = col.options;
    const staticOpts = Array.isArray(raw) ? (raw as string[]) : [];
    const source =
      raw && typeof raw === "object" && "source" in raw
        ? String((raw as { source: string }).source)
        : "";
    const opts = source ? listOptions[source] ?? [] : staticOpts;

    return (
      <label className="flex min-w-[140px] flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <select
          className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          value={String(row[col.key] ?? "")}
          onChange={(e) => onPatch({ [col.key]: e.target.value })}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (col.type === "text") {
    return (
      <label className="flex min-w-[160px] flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 pr-7 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            placeholder={col.placeholder ?? ""}
            value={String(row[col.key] ?? "")}
            onChange={(e) => onPatch({ [col.key]: e.target.value })}
          />
          {String(row[col.key] ?? "").length > 0 && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear"
              onClick={() => onPatch({ [col.key]: "" })}
            >
              ×
            </button>
          )}
        </div>
      </label>
    );
  }

  return null;
}

export function RuleBuilderField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const rb = normalizeValue(value);
  const schemaCols = useMemo(() => field.rule_schema ?? [], [field.rule_schema]);
  const addRuleLabel = String(field.config?.add_rule_label ?? "Add Rule");
  const addCondLabel = String(field.config?.add_sub_rule_label ?? "Add Condition");

  const sources = useMemo(() => {
    const s = new Set<string>();
    for (const col of schemaCols) {
      const o = col.options;
      if (o && typeof o === "object" && "source" in o) {
        s.add(String((o as { source: string }).source));
      }
    }
    return [...s];
  }, [schemaCols]);

  const [listOptions, setListOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;
    Promise.all(
      sources.map((src) =>
        getDatasourceCached(src).then((list) => [src, list] as const)
      )
    )
      .then((pairs) => {
        if (cancelled) return;
        setListOptions((prev) => {
          const n = { ...prev };
          for (const [src, list] of pairs) n[src] = list;
          return n;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sources]);

  const pushRules = (next: RuleBuilderValue) => onChange(next);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-700"
          onClick={() =>
            pushRules({
              ...rb,
              rules: [
                ...rb.rules,
                { conditions_operator: "and", conditions: [{}] },
              ],
            })
          }
        >
          + {addRuleLabel}
        </button>
      </div>

      {rb.rules.map((rule, ruleIdx) => (
        <React.Fragment key={ruleIdx}>
          {ruleIdx > 0 ? (
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-px min-w-[2rem] flex-1 bg-gradient-to-r from-transparent to-gray-200" />
              <AndOrToggle
                value={rb.rules_join}
                onChange={(next) => pushRules({ ...rb, rules_join: next })}
                ariaLabel="Combine separate rules with AND or OR"
              />
              <div className="h-px min-w-[2rem] flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>
          ) : null}

          <div className="relative rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
            <span className="absolute left-3 top-3 rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Rule {(ruleIdx + 1).toString().padStart(2, "0")}
            </span>
            <div className="absolute right-3 top-2 flex items-center gap-2">
              <AndOrToggle
                compact
                value={rule.conditions_operator}
                onChange={(next) => {
                  const rules = rb.rules.map((r, ri) =>
                    ri === ruleIdx ? { ...r, conditions_operator: next } : r
                  );
                  pushRules({ ...rb, rules });
                }}
                ariaLabel="Combine conditions inside this rule with AND or OR"
              />
              <button
                type="button"
                className="rounded p-1 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete rule"
                onClick={() => {
                  const rules = rb.rules.filter((_, i) => i !== ruleIdx);
                  pushRules({
                    ...rb,
                    rules: rules.length
                      ? rules
                      : [{ conditions_operator: "and", conditions: [{}] }],
                  });
                }}
              >
                Remove
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {rule.conditions.map((row, condIdx) => (
                <div
                  key={condIdx}
                  className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-3"
                >
                  {schemaCols.map((col) => (
                    <RuleSchemaCell
                      key={col.key}
                      col={col}
                      row={row}
                      listOptions={listOptions}
                      onPatch={(patch) => {
                        const rules = rb.rules.map((r, ri) => {
                          if (ri !== ruleIdx) return r;
                          const conditions = r.conditions.map((c, ci) =>
                            ci === condIdx ? { ...c, ...patch } : c
                          );
                          return { ...r, conditions };
                        });
                        pushRules({ ...rb, rules });
                      }}
                    />
                  ))}
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        const rules = rb.rules.map((r, ri) =>
                          ri === ruleIdx
                            ? { ...r, conditions: [...r.conditions, {}] }
                            : r
                        );
                        pushRules({ ...rb, rules });
                      }}
                    >
                      + {addCondLabel}
                    </button>
                    {rule.conditions.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-red-600"
                        onClick={() => {
                          const rules = rb.rules.map((r, ri) => {
                            if (ri !== ruleIdx) return r;
                            const conditions = r.conditions.filter(
                              (_, ci) => ci !== condIdx
                            );
                            return {
                              ...r,
                              conditions: conditions.length ? conditions : [{}],
                            };
                          });
                          pushRules({ ...rb, rules });
                        }}
                      >
                        Remove condition
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
