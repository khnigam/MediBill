import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useCorporateIdInput } from "./useCorporateIdInput";
import {
  APPRECIATE_CORPORATE_CONFIG,
  AWARDING_CORPORATE_CONFIG,
  NOMINATION_CORPORATE_CONFIG,
  programFormPath
} from "./formConfigKeys";
function ProgramAwardTypePage() {
  const { draft, setDraft, commitDraftToUrl, q, corporateId } = useCorporateIdInput();
  const appreciateCorpHref = programFormPath(corporateId, APPRECIATE_CORPORATE_CONFIG);
  const awardingCorpHref = programFormPath(corporateId, AWARDING_CORPORATE_CONFIG);
  const nominationCorpHref = programFormPath(corporateId, NOMINATION_CORPORATE_CONFIG);
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 w-full max-w-5xl", children: [
    /* @__PURE__ */ jsxs("header", { className: "mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Appreciation configuration" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-sm text-gray-600", children: "Pick which award program you want to configure. Set corporate id first; it is carried on the URL for every step." })
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
            className: "mt-1 w-36 rounded-md border border-gray-300 px-2 py-1.5 text-sm",
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
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: `/program-config/non-monetary?${q}`,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-900 hover:shadow-md",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Non-monetary awards" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Browse categories (when enabled) and badges, then open the program form for a selected badge." })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: `/program-config/monetary?${q}`,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-900 hover:shadow-md",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Monetary awards" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Monetary appreciation flows and awarding corporate configuration." })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: `/program-config/nomination?${q}`,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-900 hover:shadow-md",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Nomination rewards" }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-gray-600", children: "Nomination programs and nomination corporate configuration." })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-10 border-t border-gray-200 pt-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-gray-500", children: "Corporate-wide program forms" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-3xl text-sm text-gray-600", children: "Each module uses its own options slice and saved document (a different form config key per card below)." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: appreciateCorpHref,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-gray-900 hover:shadow-md",
          "aria-label": "Appreciate corporate-wide configuration, edit or modify",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Appreciate \u2014 corporate-wide configuration" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 flex-1 text-sm text-gray-600", children: [
              "Key ",
              /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1 py-0.5 text-xs", children: APPRECIATE_CORPORATE_CONFIG }),
              " only. Click anywhere on this card to open the form."
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mt-4 text-sm font-semibold text-gray-900 group-hover:underline", children: "Edit / modify \u2192" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: awardingCorpHref,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-gray-900 hover:shadow-md",
          "aria-label": "Awarding monetary corporate configuration, edit or modify",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Awarding (monetary) \u2014 corporate" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 flex-1 text-sm text-gray-600", children: [
              "Key ",
              /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1 py-0.5 text-xs", children: AWARDING_CORPORATE_CONFIG }),
              " only. Click anywhere on this card to open the form."
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mt-4 text-sm font-semibold text-gray-900 group-hover:underline", children: "Edit / modify \u2192" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: nominationCorpHref,
          className: "group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-gray-900 hover:shadow-md",
          "aria-label": "Nomination corporate configuration, edit or modify",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-lg font-semibold text-gray-900 group-hover:underline", children: "Nomination \u2014 corporate" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-2 flex-1 text-sm text-gray-600", children: [
              "Key ",
              /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1 py-0.5 text-xs", children: NOMINATION_CORPORATE_CONFIG }),
              " only. Click anywhere on this card to open the form."
            ] }),
            /* @__PURE__ */ jsx("span", { className: "mt-4 text-sm font-semibold text-gray-900 group-hover:underline", children: "Edit / modify \u2192" })
          ]
        }
      )
    ] })
  ] });
}
export {
  ProgramAwardTypePage as default
};
