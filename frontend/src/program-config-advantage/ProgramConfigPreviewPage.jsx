import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { corporateIdQueryString, parseCorporateIdParam } from "./corporateIdSearchParam";
import {
  fetchAppreciationConfigCurrent,
  parseAppreciationConfigCurrentResponse
} from "./appreciationConfigApi";
import { mergeAppreciationCurrentLayers } from "../config-form/programFormLogic";
function isTruthyParam(v) {
  return v === "1" || v === "true";
}
function layerKeyCount(layer) {
  return Object.keys(layer).length;
}
function ProgramConfigPreviewPage() {
  const [searchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const badgeId = (searchParams.get("badge_id") ?? "").trim();
  const categoryId = (searchParams.get("category_id") ?? "").trim();
  const isCategoryEnabled = isTruthyParam(searchParams.get("is_category_enabled"));
  const [layers, setLayers] = useState(null);
  const [merged, setMerged] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const formQuery = useMemo(() => {
    const q = new URLSearchParams(searchParams);
    q.set("from_preview", "1");
    return q.toString();
  }, [searchParams]);
  const load = useCallback(() => {
    if (!badgeId) {
      setLayers(null);
      setMerged({});
      setError("Missing badge_id \u2014 open this screen from the awards list.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAppreciationConfigCurrent({
      corporateId,
      badgeId,
      categoryId: categoryId || null,
      formConfigKey: null
    }).then((raw) => {
      if (cancelled) return;
      const parsed = parseAppreciationConfigCurrentResponse(raw);
      if (!parsed) {
        setError("Unexpected response from current config API.");
        setLayers(null);
        setMerged({});
        return;
      }
      if (!parsed.success) {
        setError(parsed.info ?? "Could not load configuration.");
        setLayers(null);
        setMerged({});
        return;
      }
      const data = parsed.data ?? { corporate: {}, category: {}, award: {} };
      setLayers(data);
      setMerged(mergeAppreciationCurrentLayers(data));
    }).catch((e) => {
      if (!cancelled) {
        setError(e.message ?? "Failed to load");
        setLayers(null);
        setMerged({});
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [badgeId, categoryId, corporateId]);
  useEffect(() => {
    return load();
  }, [load]);
  const hasAnyLayer = layers != null && (layerKeyCount(layers.corporate) > 0 || layerKeyCount(layers.category) > 0 || layerKeyCount(layers.award) > 0);
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 w-full max-w-5xl", children: [
    /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: `/program-config/non-monetary?${corporateIdQueryString(corporateId)}`,
        className: "font-medium text-gray-700 underline hover:text-gray-900",
        children: "\u2190 Non-monetary awards"
      }
    ) }),
    /* @__PURE__ */ jsxs("header", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Configuration preview" }),
      /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-2xl text-sm text-gray-600", children: [
        "Effective config merges ",
        /* @__PURE__ */ jsx("strong", { children: "corporate" }),
        " \u2192 ",
        /* @__PURE__ */ jsx("strong", { children: "category" }),
        " (when",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "category_id" }),
        " is set) \u2192 ",
        /* @__PURE__ */ jsx("strong", { children: "award" }),
        ". Source:",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "GET /appreciation_config/current" }),
        ".",
        !isCategoryEnabled ? /* @__PURE__ */ jsx("span", { className: "block mt-1 text-gray-500", children: "Category list is off for this corporate; the form will hide the program category dropdown." }) : null
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", children: error }),
    loading && /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Loading saved layers\u2026" }),
    !loading && layers && /* @__PURE__ */ jsxs(Fragment, { children: [
      !hasAnyLayer && /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700", children: [
        "No saved configuration yet \u2014 use ",
        /* @__PURE__ */ jsx("strong", { children: "Modify" }),
        " to create one. The program name can be prefilled from the awards list."
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-6 lg:grid-cols-3", children: ["corporate", "category", "award"].map((key) => /* @__PURE__ */ jsxs("section", { className: "rounded-xl border border-gray-200 bg-white p-4 shadow-sm", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-sm font-semibold capitalize text-gray-800", children: [
          key,
          " layer"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-gray-500", children: [
          layerKeyCount(layers[key]),
          " top-level keys"
        ] }),
        /* @__PURE__ */ jsx("pre", { className: "mt-3 max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100", children: JSON.stringify(layers[key], null, 2) })
      ] }, key)) }),
      /* @__PURE__ */ jsxs("section", { className: "mt-8 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-indigo-900", children: "Merged (effective) config" }),
        /* @__PURE__ */ jsx("pre", { className: "mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100", children: JSON.stringify(merged, null, 2) })
      ] })
    ] }),
    !loading && badgeId && /* @__PURE__ */ jsx("div", { className: "mt-8 flex flex-wrap gap-3", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: `/program-config/form?${formQuery}`,
        className: "inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800",
        children: "Modify"
      }
    ) })
  ] });
}
export {
  ProgramConfigPreviewPage as default
};
