import { jsx, jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from "react";
import { getDatasourceCached } from "./schemaApi";
import { matchesCondition } from "./programFormLogic";
function normalizeValue(raw) {
  const v = raw;
  const rulesJoin = v?.rules_join === "or" ? "or" : "and";
  if (v && Array.isArray(v.rules) && v.rules.length > 0) {
    return {
      rules_join: rulesJoin,
      rules: v.rules.map((r) => {
        const row = r;
        const conditions_operator = row.conditions_operator === "or" ? "or" : "and";
        const conditions = Array.isArray(row.conditions) && row.conditions.length > 0 ? row.conditions.map((c) => ({ ...c })) : [{}];
        return { conditions_operator, conditions };
      })
    };
  }
  return {
    rules_join: "and",
    rules: [{ conditions_operator: "and", conditions: [{}] }]
  };
}
function AndOrToggle({
  value,
  onChange,
  compact,
  ariaLabel
}) {
  const pad = compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs";
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "inline-flex rounded-lg border border-gray-200 bg-white p-0.5 font-semibold uppercase tracking-wide text-gray-600 shadow-sm",
      role: "group",
      "aria-label": ariaLabel,
      children: ["and", "or"].map((opt) => {
        const on = value === opt;
        return /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `rounded-md ${pad} transition ${on ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`,
            onClick: () => onChange(opt),
            children: opt
          },
          opt
        );
      })
    }
  );
}
function RuleSchemaCell({
  col,
  row,
  onPatch,
  listOptions
}) {
  if (!matchesCondition(col.depends_on, row)) return null;
  const label = (col.label ?? col.key).replace(/_/g, " ");
  if (col.type === "select") {
    const raw = col.options;
    const staticOpts = Array.isArray(raw) ? raw : [];
    const source = raw && typeof raw === "object" && "source" in raw ? String(raw.source) : "";
    const opts = source ? listOptions[source] ?? [] : staticOpts;
    return /* @__PURE__ */ jsxs("label", { className: "flex min-w-[140px] flex-1 flex-col gap-1", children: [
      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-gray-500", children: label }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          className: "rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
          value: String(row[col.key] ?? ""),
          onChange: (e) => onPatch({ [col.key]: e.target.value }),
          children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "\u2014" }),
            opts.map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }, o))
          ]
        }
      )
    ] });
  }
  if (col.type === "text") {
    return /* @__PURE__ */ jsxs("label", { className: "flex min-w-[160px] flex-1 flex-col gap-1", children: [
      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-gray-500", children: label }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            className: "w-full rounded-lg border border-gray-200 bg-white px-2 py-2 pr-7 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            placeholder: col.placeholder ?? "",
            value: String(row[col.key] ?? ""),
            onChange: (e) => onPatch({ [col.key]: e.target.value })
          }
        ),
        String(row[col.key] ?? "").length > 0 && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700",
            "aria-label": "Clear",
            onClick: () => onPatch({ [col.key]: "" }),
            children: "\xD7"
          }
        )
      ] })
    ] });
  }
  return null;
}
function RuleBuilderField({
  field,
  value,
  onChange
}) {
  const rb = normalizeValue(value);
  const schemaCols = useMemo(() => field.rule_schema ?? [], [field.rule_schema]);
  const addRuleLabel = String(field.config?.add_rule_label ?? "Add Rule");
  const addCondLabel = String(field.config?.add_sub_rule_label ?? "Add Condition");
  const sources = useMemo(() => {
    const s = /* @__PURE__ */ new Set();
    for (const col of schemaCols) {
      const o = col.options;
      if (o && typeof o === "object" && "source" in o) {
        s.add(String(o.source));
      }
    }
    return [...s];
  }, [schemaCols]);
  const [listOptions, setListOptions] = useState({});
  useEffect(() => {
    if (sources.length === 0) return;
    let cancelled = false;
    Promise.all(
      sources.map(
        (src) => getDatasourceCached(src).then((list) => [src, list])
      )
    ).then((pairs) => {
      if (cancelled) return;
      setListOptions((prev) => {
        const n = { ...prev };
        for (const [src, list] of pairs) n[src] = list;
        return n;
      });
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [sources]);
  const pushRules = (next) => onChange(next);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-indigo-700",
        onClick: () => pushRules({
          ...rb,
          rules: [
            ...rb.rules,
            { conditions_operator: "and", conditions: [{}] }
          ]
        }),
        children: [
          "+ ",
          addRuleLabel
        ]
      }
    ) }),
    rb.rules.map((rule, ruleIdx) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
      ruleIdx > 0 ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-3 py-1", children: [
        /* @__PURE__ */ jsx("div", { className: "h-px min-w-[2rem] flex-1 bg-gradient-to-r from-transparent to-gray-200" }),
        /* @__PURE__ */ jsx(
          AndOrToggle,
          {
            value: rb.rules_join,
            onChange: (next) => pushRules({ ...rb, rules_join: next }),
            ariaLabel: "Combine separate rules with AND or OR"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "h-px min-w-[2rem] flex-1 bg-gradient-to-l from-transparent to-gray-200" })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { className: "relative rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: "absolute left-3 top-3 rounded bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", children: [
          "Rule ",
          (ruleIdx + 1).toString().padStart(2, "0")
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "absolute right-3 top-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            AndOrToggle,
            {
              compact: true,
              value: rule.conditions_operator,
              onChange: (next) => {
                const rules = rb.rules.map(
                  (r, ri) => ri === ruleIdx ? { ...r, conditions_operator: next } : r
                );
                pushRules({ ...rb, rules });
              },
              ariaLabel: "Combine conditions inside this rule with AND or OR"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "rounded p-1 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600",
              "aria-label": "Delete rule",
              onClick: () => {
                const rules = rb.rules.filter((_, i) => i !== ruleIdx);
                pushRules({
                  ...rb,
                  rules: rules.length ? rules : [{ conditions_operator: "and", conditions: [{}] }]
                });
              },
              children: "Remove"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-8 space-y-4", children: rule.conditions.map((row, condIdx) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-3",
            children: [
              schemaCols.map((col) => /* @__PURE__ */ jsx(
                RuleSchemaCell,
                {
                  col,
                  row,
                  listOptions,
                  onPatch: (patch) => {
                    const rules = rb.rules.map((r, ri) => {
                      if (ri !== ruleIdx) return r;
                      const conditions = r.conditions.map(
                        (c, ci) => ci === condIdx ? { ...c, ...patch } : c
                      );
                      return { ...r, conditions };
                    });
                    pushRules({ ...rb, rules });
                  }
                },
                col.key
              )),
              /* @__PURE__ */ jsxs("div", { className: "ml-auto flex flex-wrap items-center justify-end gap-2", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: "text-xs font-semibold text-indigo-600 hover:text-indigo-800",
                    onClick: () => {
                      const rules = rb.rules.map(
                        (r, ri) => ri === ruleIdx ? { ...r, conditions: [...r.conditions, {}] } : r
                      );
                      pushRules({ ...rb, rules });
                    },
                    children: [
                      "+ ",
                      addCondLabel
                    ]
                  }
                ),
                rule.conditions.length > 1 && /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    className: "text-xs text-gray-500 hover:text-red-600",
                    onClick: () => {
                      const rules = rb.rules.map((r, ri) => {
                        if (ri !== ruleIdx) return r;
                        const conditions = r.conditions.filter(
                          (_, ci) => ci !== condIdx
                        );
                        return {
                          ...r,
                          conditions: conditions.length ? conditions : [{}]
                        };
                      });
                      pushRules({ ...rb, rules });
                    },
                    children: "Remove condition"
                  }
                )
              ] })
            ]
          },
          condIdx
        )) })
      ] })
    ] }, ruleIdx))
  ] });
}
export {
  RuleBuilderField
};
