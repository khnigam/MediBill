import { jsx, jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { corporateIdQueryString } from "./corporateIdSearchParam";
import { APPRECIATE_CATEGORY_CONFIG, programFormPath } from "./formConfigKeys";
import { useCorporateIdInput } from "./useCorporateIdInput";
import {
  badgeCategoryId,
  badgeDisplayName,
  badgePrimaryId,
  categoryRowMatchKey,
  fetchNonMonetaryAwards,
  parseNonMonetaryAwardsResponse
} from "./nonMonetaryAwardsApi";
function nonMonetaryConfigPreviewHref(opts) {
  const bid = badgePrimaryId(opts.badge);
  const q = new URLSearchParams();
  q.set("corporate_id", String(opts.corporateId));
  if (bid) q.set("badge_id", bid);
  const catId = opts.selectedCategoryId ?? badgeCategoryId(opts.badge);
  if (catId) q.set("category_id", catId);
  if (opts.isCategoryEnabled) q.set("is_category_enabled", "1");
  q.set("award_name", badgeDisplayName(opts.badge));
  return `/program-config/preview?${q.toString()}`;
}
function newNonMonetaryBadgeFormHref(opts) {
  if (!opts.canCreateBadge) return null;
  if (opts.categoryFlowActive && !opts.selectedCategoryId) return null;
  const q = new URLSearchParams();
  q.set("corporate_id", String(opts.corporateId));
  q.set("to_create", "1");
  q.set("award_name", "New award");
  if (opts.isCategoryEnabled && opts.selectedCategoryId) {
    q.set("category_id", opts.selectedCategoryId);
    q.set("is_category_enabled", "1");
  }
  return `/program-config/form?${q.toString()}`;
}
function newNonMonetaryCategoryFormHref(opts) {
  if (!opts.canCreateCategory) return null;
  if (!opts.categoryFlowActive) return null;
  const q = new URLSearchParams();
  q.set("corporate_id", String(opts.corporateId));
  q.set("form_config_key", APPRECIATE_CATEGORY_CONFIG);
  q.set("to_create", "1");
  q.set("is_category_enabled", "1");
  q.set("award_name", "New category");
  return `/program-config/form?${q.toString()}`;
}
function IconTile({ label, imageUrl }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(imageUrl && !broken);
  return /* @__PURE__ */ jsx("div", { className: "flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100", children: showImg ? /* @__PURE__ */ jsx(
    "img",
    {
      src: imageUrl,
      alt: "",
      className: "h-full w-full object-contain p-2",
      onError: () => setBroken(true)
    }
  ) : /* @__PURE__ */ jsx("span", { className: "px-2 text-center text-xs font-medium leading-snug text-gray-600 line-clamp-3", children: label }) });
}
function SelectionGrid({
  children,
  columns = 3
}) {
  const cls = columns === 4 ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
  return /* @__PURE__ */ jsx("div", { className: cls, children });
}
function NonMonetaryAwardsListPage() {
  const { corporateId, draft, setDraft, commitDraftToUrl } = useCorporateIdInput();
  const [data, setData] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [awardSearch, setAwardSearch] = useState("");
  const searchNeedle = awardSearch.trim().toLowerCase();
  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setParseError(null);
    fetchNonMonetaryAwards(corporateId).then((raw) => {
      if (cancelled) return;
      const parsed = parseNonMonetaryAwardsResponse(raw);
      if (!parsed) {
        setParseError("Response was not an object with badges (unexpected shape).");
        setData(null);
        return;
      }
      setData(parsed);
      setSelectedCategoryId(null);
      setAwardSearch("");
    }).catch((e) => {
      if (!cancelled) setError(e.message ?? "Failed to load awards");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [corporateId]);
  useEffect(() => {
    return load();
  }, [load]);
  const categoryFlowActive = Boolean(
    data?.is_category_enabled && data.categoryEntries.length > 0
  );
  const filteredCategoryEntries = useMemo(() => {
    if (!data) return [];
    const entries = data.categoryEntries;
    if (!searchNeedle) return entries;
    return entries.filter(
      (cat) =>
        (cat.name ?? "").toLowerCase().includes(searchNeedle) ||
        String(cat.id ?? "").toLowerCase().includes(searchNeedle)
    );
  }, [data, searchNeedle]);
  const filteredBadges = useMemo(() => {
    if (!data) return [];
    let list;
    if (!data.is_category_enabled || !categoryFlowActive) list = data.badges;
    else if (!selectedCategoryId) list = [];
    else {
      const selectedCat = data.categoryEntries.find((c) => String(c.id) === String(selectedCategoryId));
      const matchKey = selectedCat ? categoryRowMatchKey(selectedCat) : "";
      list = matchKey ? data.badges.filter((b) => badgeCategoryId(b) === matchKey) : [];
    }
    if (!searchNeedle) return list;
    return list.filter((b) => {
      const name = badgeDisplayName(b).toLowerCase();
      const id = badgePrimaryId(b);
      return name.includes(searchNeedle) || Boolean(id && id.toLowerCase().includes(searchNeedle));
    });
  }, [data, selectedCategoryId, categoryFlowActive, searchNeedle]);
  const showCategoryPicker = categoryFlowActive && (selectedCategoryId === null || selectedCategoryId === "");
  const createNewBadgeHref = useMemo(() => {
    if (!data || loading) return null;
    return newNonMonetaryBadgeFormHref({
      corporateId,
      selectedCategoryId,
      isCategoryEnabled: Boolean(data.is_category_enabled),
      categoryFlowActive,
      canCreateBadge: data.can_create_badge
    });
  }, [categoryFlowActive, corporateId, data, loading, selectedCategoryId]);
  const createNewCategoryHref = useMemo(() => {
    if (!data || loading) return null;
    return newNonMonetaryCategoryFormHref({
      corporateId,
      categoryFlowActive,
      canCreateCategory: data.can_create_category !== false
    });
  }, [categoryFlowActive, corporateId, data, loading]);
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 w-full max-w-6xl", children: [
    /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: `/program-config?${corporateIdQueryString(corporateId)}`,
        className: "font-medium text-gray-700 underline hover:text-gray-900",
        children: "\u2190 Award type"
      }
    ) }),
    /* @__PURE__ */ jsxs("header", { className: "mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Non-monetary awards" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-2xl text-sm text-gray-600", children: [
          "Data from ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "GET /appreciation_config/nonomonetary_awards" }),
          " (",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "corporate_id" }),
          " query, default 900). Categories use",
          " ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "is_category_enabled" }),
          "; badges filter by",
          " ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "generic_category_id" }),
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "flex flex-col text-xs font-medium text-gray-700", children: [
        "Corporate ID",
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            inputMode: "numeric",
            pattern: "[0-9]*",
            autoComplete: "off",
            className: "mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm",
            value: draft,
            onChange: (e) => setDraft(e.target.value),
            onBlur: () => commitDraftToUrl(),
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              }
            },
            "aria-label": "Corporate ID"
          }
        )
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", children: error }),
    parseError && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", children: parseError }),
    !loading && data && /* @__PURE__ */ jsxs("div", { className: "mb-6 max-w-xl", children: [
      /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-gray-700", htmlFor: "non-monetary-award-search", children: "Search" }),
      /* @__PURE__ */ jsx("input", {
        id: "non-monetary-award-search",
        type: "search",
        value: awardSearch,
        onChange: (e) => setAwardSearch(e.target.value),
        autoComplete: "off",
        placeholder: showCategoryPicker ? "Filter categories by name or ID\u2026" : "Filter awards by name or ID\u2026",
        className: "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      })
    ] }),
    !loading && data?.is_category_enabled && !categoryFlowActive && data.badges.length > 0 && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700", children: "Category mode is on but no categories were returned \u2014 showing all badges." }),
    loading && /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Loading\u2026" }),
    !loading && data && data.is_category_enabled && showCategoryPicker && /* @__PURE__ */ jsxs("section", { className: "mb-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-gray-500", children: "Categories" }),
        createNewCategoryHref ? /* @__PURE__ */ jsx(
          Link,
          {
            to: createNewCategoryHref,
            className: "inline-flex w-fit items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm hover:border-indigo-400 hover:bg-indigo-100",
            children: "+ Create new category"
          }
        ) : null
      ] }),
      filteredCategoryEntries.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600", children: searchNeedle ? "No categories match your search." : "No categories returned for this corporate." }),
        createNewCategoryHref ? /* @__PURE__ */ jsx(
          Link,
          {
            to: createNewCategoryHref,
            className: "inline-flex text-sm font-semibold text-indigo-700 underline hover:text-indigo-900",
            children: "Create new category instead \u2192"
          }
        ) : null
      ] }) : /* @__PURE__ */ jsx(SelectionGrid, { columns: 4, children: filteredCategoryEntries.map((cat) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setSelectedCategoryId(cat.id),
          className: "flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md",
          children: [
            /* @__PURE__ */ jsx(IconTile, { label: cat.name, imageUrl: cat.image_icon }),
            /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-semibold text-gray-900", children: cat.name }),
            /* @__PURE__ */ jsx("span", { className: "mt-1 text-xs text-gray-500", children: "View awards \u2192" })
          ]
        },
        cat.id
      )) })
    ] }),
    !loading && data && data.is_category_enabled && selectedCategoryId && /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap items-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "text-sm font-medium text-gray-700 underline hover:text-gray-900",
          onClick: () => setSelectedCategoryId(null),
          children: "\u2190 All categories"
        }
      ),
      /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-500", children: [
        "Showing awards in category",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-800", children: data.categoryEntries.find((c) => String(c.id) === String(selectedCategoryId))?.name ?? selectedCategoryId })
      ] })
    ] }),
    !loading && data && (!categoryFlowActive || selectedCategoryId) && /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-gray-500", children: categoryFlowActive && selectedCategoryId ? "Awards in category" : "All awards" }),
        createNewBadgeHref ? /* @__PURE__ */ jsx(
          Link,
          {
            to: createNewBadgeHref,
            className: "inline-flex w-fit items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm hover:border-indigo-400 hover:bg-indigo-100",
            children: "+ Create new badge"
          }
        ) : data.is_category_enabled && categoryFlowActive && !selectedCategoryId ? /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "Choose a category above to create a badge in that category." }) : null
      ] }),
      data.is_category_enabled && selectedCategoryId && /* @__PURE__ */ jsx("div", {
        className: "mb-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 shadow-sm",
        children: /* @__PURE__ */ jsxs("div", {
          className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          children: [
            /* @__PURE__ */ jsxs("div", {
              children: [
                /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-gray-900", children: "Create / modify category configuration" }),
                /* @__PURE__ */ jsx("p", {
                  className: "mt-1 max-w-xl text-xs text-gray-600",
                  children: "Opens appreciate_category_config for this category. Current and save use corporate_id, category_id, config_type nonmonetary, and upsert_type category."
                })
              ]
            }),
            /* @__PURE__ */ jsx(Link, {
              to: programFormPath(corporateId, APPRECIATE_CATEGORY_CONFIG, {
                is_category_enabled: true,
                category_id: selectedCategoryId
              }),
              className: "inline-flex shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800",
              children: "Appreciate"
            })
          ]
        })
      }),
      filteredBadges.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600", children: searchNeedle ? "No awards match your search." : data.is_category_enabled ? "No badges in this category (check generic_category_id on NonmonetaryAward)." : "No badges returned." }),
        createNewBadgeHref ? /* @__PURE__ */ jsx(
          Link,
          {
            to: createNewBadgeHref,
            className: "inline-flex text-sm font-semibold text-indigo-700 underline hover:text-indigo-900",
            children: "Create new badge instead \u2192"
          }
        ) : null
      ] }) : /* @__PURE__ */ jsx(SelectionGrid, { columns: 4, children: filteredBadges.map((badge, idx) => {
        const name = badgeDisplayName(badge);
        const icon = typeof badge.image_icon === "string" ? badge.image_icon : typeof badge.image_icon_url === "string" ? badge.image_icon_url : null;
        const href = nonMonetaryConfigPreviewHref({
          corporateId,
          badge,
          selectedCategoryId,
          isCategoryEnabled: Boolean(data?.is_category_enabled)
        });
        return /* @__PURE__ */ jsxs(
          Link,
          {
            to: href,
            className: "flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-400 hover:shadow-md",
            children: [
              /* @__PURE__ */ jsx(IconTile, { label: name, imageUrl: icon }),
              /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm font-semibold text-gray-900", children: name }),
              /* @__PURE__ */ jsx("span", { className: "mt-1 text-xs text-gray-500", children: "Configure program \u2192" })
            ]
          },
          badgePrimaryId(badge) ?? idx
        );
      }) })
    ] })
  ] });
}
export {
  NonMonetaryAwardsListPage as default
};
