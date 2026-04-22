import { jsx, jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { corporateIdQueryString, parseCorporateIdParam } from "./corporateIdSearchParam";
import { AWARDING_CATEGORY_CONFIG, AWARDING_CORPORATE_CONFIG, programFormPath } from "./formConfigKeys";
function MonetaryAwardsPlaceholderPage() {
  const [searchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const q = corporateIdQueryString(corporateId);
  const corporateFormHref = programFormPath(corporateId, AWARDING_CORPORATE_CONFIG);
  const categoryFormHref = programFormPath(corporateId, AWARDING_CATEGORY_CONFIG, { is_category_enabled: true });
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 w-full max-w-2xl", children: [
    /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: `/program-config?${q}`,
        className: "font-medium text-gray-700 underline hover:text-gray-900",
        children: "\u2190 Award type"
      }
    ) }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Monetary awards" }),
    /* @__PURE__ */ jsxs("p", { className: "mt-2 text-sm text-gray-500", children: [
      "Corporate ID: ",
      corporateId
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-gray-600", children: "This path is reserved for monetary appreciation configuration. Hook it to your Rails monetary endpoints when ready." }),
    /* @__PURE__ */ jsx("div", { className: "mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-gray-900", children: "Awarding (monetary) \u2014 corporate configuration" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-600", children: "Uses options key awarding_corporate_config; save sends config_type monetary and form_config_key on upsert." }),
      /* @__PURE__ */ jsx(
        Link,
        {
          to: corporateFormHref,
          className: "mt-1 inline-flex w-fit text-sm font-semibold text-indigo-700 underline hover:text-indigo-900",
          children: "Edit / modify awarding corporate configuration \u2192"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", {
      className: "mt-8 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-5 shadow-sm",
      children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", {
          children: [
            /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-gray-900", children: "Create / modify category configuration" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-xl text-xs text-gray-600", children: "Monetary flow: opens awarding_category_config on the program form." })
          ]
        }),
        /* @__PURE__ */ jsx(Link, {
          to: categoryFormHref,
          className: "inline-flex shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800",
          children: "Awarding"
        })
      ] })
    })
  ] });
}
export {
  MonetaryAwardsPlaceholderPage as default
};
