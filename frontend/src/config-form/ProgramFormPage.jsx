import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BlockCard } from "./BlockCard";
import { ProgramFormRemoteContext } from "./ProgramFormRemoteContext";
import { fetchProgramFormSchema } from "./schemaApi";
import {
  buildProgramConfigApiPayload,
  effectiveConfigScopeVisibility,
  filterBlocksForConfigScope,
  filterProgramSchemaForCategoryVisibility,
  isBlockVisibleForConfigScope,
  isInheritedCorporateOrCategoryMode,
  upsertPayloadBlockFilter
} from "./programFormLogic";
import { useProgramFormState } from "./useProgramFormState";
import { corporateIdQueryString, parseCorporateIdParam } from "../program-config-advantage/corporateIdSearchParam";
import {
  configTypeForFormConfigKey,
  isCategoryFormConfigKey,
  isCorporateFormConfigKey,
  normalizeFormConfigKey,
  upsertTypeForProgramForm
} from "../program-config-advantage/formConfigKeys";
import {
  extractBasicInformationImageFile,
  fetchAppreciationConfigCurrent,
  parseAppreciationConfigCurrentResponse,
  pickMergedProgramConfigFromCurrent,
  upsertAppreciationConfig
} from "../program-config-advantage/appreciationConfigApi";
function isTruthyQueryParam(v) {
  return v === "1" || v === "true";
}
function safeDecodeURIComponent(raw) {
  const s = (raw ?? "").trim();
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
function parseUpsertResult(res) {
  if (!res || typeof res !== "object" || Array.isArray(res)) return { ok: true };
  const o = res;
  if (o.success === false) {
    let msg = typeof o.message === "string" ? o.message : "Save failed";
    if (Array.isArray(o.errors)) msg = `${msg}: ${o.errors.map(String).join("; ")}`;
    return { ok: false, message: msg };
  }
  const msg = typeof o.message === "string" && o.message.trim() ? o.message.trim() : void 0;
  if (o.success === true) return { ok: true, message: msg };
  if (msg) return { ok: true, message: msg };
  return { ok: true };
}
function ProgramFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const badgeId = (searchParams.get("badge_id") ?? "").trim();
  const categoryId = (searchParams.get("category_id") ?? "").trim();
  const isCategoryEnabled = isTruthyQueryParam(searchParams.get("is_category_enabled"));
  const awardNameQuery = useMemo(
    () => safeDecodeURIComponent(searchParams.get("award_name")),
    [searchParams]
  );
  const toCreate = isTruthyQueryParam(searchParams.get("to_create"));
  const fromPreview = isTruthyQueryParam(searchParams.get("from_preview"));
  const formConfigKey = useMemo(
    () => normalizeFormConfigKey(searchParams.get("form_config_key")),
    [searchParams]
  );
  const categoryIdForApis = useMemo(() => {
    if (!isCategoryEnabled) return "";
    return (categoryId ?? "").trim();
  }, [isCategoryEnabled, categoryId]);
  const standaloneConfigEdit = Boolean(formConfigKey);
  const saveEnabled = Boolean(standaloneConfigEdit || toCreate || badgeId);
  const previewBackQuery = useMemo(() => {
    const q = new URLSearchParams(searchParams);
    q.delete("from_preview");
    return q.toString();
  }, [searchParams]);
  const [schema, setSchema] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [configLoadError, setConfigLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitOk, setSubmitOk] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccessModal, setSaveSuccessModal] = useState(null);
  const { formState, initializeFromSchemaAndMerged, setBlockPath } = useProgramFormState();
  const narrowInheritedMode = isInheritedCorporateOrCategoryMode(formState);
  const blocksToRender = useMemo(() => {
    if (!schema) return [];
    return filterBlocksForConfigScope(formState, schema.blocks);
  }, [formState, schema]);
  const hasInheritedModeEditableBlocks = useMemo(() => {
    if (!schema) return true;
    return schema.blocks.some(
      (b) => isBlockVisibleForConfigScope(b, true) && effectiveConfigScopeVisibility(b) !== "always"
    );
  }, [schema]);
  const initKey = useMemo(
    () => [
      corporateId,
      badgeId,
      categoryIdForApis,
      isCategoryEnabled ? "1" : "0",
      awardNameQuery,
      toCreate ? "1" : "0",
      formConfigKey ?? ""
    ].join("|"),
    [corporateId, badgeId, categoryIdForApis, isCategoryEnabled, awardNameQuery, toCreate, formConfigKey]
  );
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setConfigLoadError(null);
    (async () => {
      let doc;
      try {
        doc = await fetchProgramFormSchema(formConfigKey);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load schema");
        return;
      }
      if (cancelled) return;
      const filtered = filterProgramSchemaForCategoryVisibility(doc, isCategoryEnabled);
      setSchema(filtered);
      let merged = {};
      if (badgeId || formConfigKey) {
        try {
          const raw = await fetchAppreciationConfigCurrent({
            corporateId,
            badgeId: badgeId || null,
            categoryId: categoryIdForApis || null,
            formConfigKey: formConfigKey || null
          });
          const parsed = parseAppreciationConfigCurrentResponse(raw);
          if (!parsed?.success) {
            if (!cancelled) setConfigLoadError(parsed?.info ?? "Could not load saved configuration.");
          } else if (parsed.data) {
            merged = pickMergedProgramConfigFromCurrent(parsed.data, formConfigKey);
          }
        } catch (e) {
          if (!cancelled) setConfigLoadError(e instanceof Error ? e.message : "Failed to load current config");
        }
      }
      if (cancelled) return;
      initializeFromSchemaAndMerged(filtered.blocks, merged, {
        defaultAwardName: awardNameQuery || void 0
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    initKey,
    corporateId,
    badgeId,
    categoryIdForApis,
    isCategoryEnabled,
    awardNameQuery,
    toCreate,
    initializeFromSchemaAndMerged,
    formConfigKey
  ]);
  async function handleSubmit() {
    if (!schema) return;
    if (!saveEnabled) {
      setSubmitError("Cannot save: add badge_id to the URL, use create flow, or open a corporate/category config link.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(null);
    setSaveSuccessModal(null);
    try {
      const payloadBlockIds = upsertPayloadBlockFilter(formState, schema.blocks);
      const config = buildProgramConfigApiPayload(formState, schema.blocks, payloadBlockIds);
      const icon_image = extractBasicInformationImageFile(formState);
      const badgeTrim = (badgeId ?? "").trim();
      const res = await upsertAppreciationConfig({
        corporate_id: corporateId,
        badge_id: badgeTrim || void 0,
        category_id: categoryIdForApis || void 0,
        to_create: toCreate,
        config,
        icon_image: icon_image ?? void 0,
        form_config_key: formConfigKey || void 0,
        config_type: configTypeForFormConfigKey(formConfigKey),
        upsert_type: upsertTypeForProgramForm(formConfigKey)
      });
      const parsed = parseUpsertResult(res);
      if (!parsed.ok) {
        setSubmitError(parsed.message);
        return;
      }
      const okMessage = parsed.message ?? "Configuration saved";
      setSaveSuccessModal({ message: okMessage });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }
  const listHref = `/program-config/non-monetary?${corporateIdQueryString(corporateId)}`;
  const postSaveHref = useMemo(() => {
    const q = corporateIdQueryString(corporateId);
    if (formConfigKey && isCorporateFormConfigKey(formConfigKey)) return `/program-config?${q}`;
    return `/program-config/non-monetary?${q}`;
  }, [corporateId, formConfigKey]);
  const backHref = useMemo(() => {
    const q = corporateIdQueryString(corporateId);
    if (fromPreview) return `/program-config/preview?${previewBackQuery}`;
    if (formConfigKey && isCorporateFormConfigKey(formConfigKey)) return `/program-config?${q}`;
    return `/program-config/non-monetary?${q}`;
  }, [corporateId, formConfigKey, fromPreview, previewBackQuery]);
  const backLabel = fromPreview ? "\u2190 Preview" : formConfigKey && isCorporateFormConfigKey(formConfigKey) ? "\u2190 Appreciation configuration" : "\u2190 Non-monetary awards";
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 w-full max-w-5xl", children: [
    /* @__PURE__ */ jsxs("header", { className: "mb-8", children: [
      /* @__PURE__ */ jsx("p", { className: "mb-2 text-sm", children: /* @__PURE__ */ jsx(Link, { to: backHref, className: "font-medium text-gray-700 underline hover:text-gray-900", children: backLabel }) }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-gray-900", children: formConfigKey ? `Configuration (${formConfigKey})` : "Program configuration" }),
      standaloneConfigEdit ? /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-2xl text-sm text-gray-600", children: [
        "Schema blocks are read from the matching key on ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "GET /appreciation_config/options" }),
        " (",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: formConfigKey }),
        "). Current values use ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "GET /appreciation_config/current" }),
        " (corporate_id, badge_id, category_id, config_type). Save posts ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "POST /appreciation_config/upsert" }),
        " (multipart) with ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "form_config_key" }),
        ", ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "config_type" }),
        ", ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "upsert_type" }),
        " (corporate / category / individual), and ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "badge_id" }),
        " / ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "category_id" }),
        " only when set in the URL."
      ] }) : /* @__PURE__ */ jsxs("p", { className: "mt-2 max-w-2xl text-sm text-gray-600", children: [
        "Schema from ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "/appreciation_config/options" }),
        " (including",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "config_options" }),
        " for configuration scope). Saved layers load from ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "GET /appreciation_config/current" }),
        " (merged into the form). Submit uses ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "POST /appreciation_config/upsert" }),
        " as",
        " ",
        /* @__PURE__ */ jsx("strong", { children: "multipart" }),
        " (",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "config" }),
        " JSON string, optional",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "icon_image" }),
        " file).",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "category_id" }),
        " is temporarily fixed to",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "1" }),
        ". ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "to_create" }),
        " ",
        "from the URL (",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "to_create=1" }),
        " when creating a new award row). Set",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "REACT_APP_ADVANTAGE_CONFIG_TOKEN" }),
        " in",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: ".env.local" }),
        "."
      ] })
    ] }),
    loadError && /* @__PURE__ */ jsx("div", { className: "mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", children: loadError }),
    configLoadError && /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", children: [
      configLoadError,
      " (form started from defaults where needed.)"
    ] }),
    !schema && !loadError && /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500", children: "Loading configuration schema\u2026" }),
    schema && /* @__PURE__ */ jsxs(ProgramFormRemoteContext.Provider, { value: schema.external_datasources ?? null, children: [
      narrowInheritedMode ? /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950", children: [
        /* @__PURE__ */ jsx("strong", { children: "Corporate / category mode:" }),
        " only blocks with",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "config_scope_visibility" }),
        " of",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "always" }),
        ",",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "inherited_and_custom" }),
        ", or",
        " ",
        /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "inherited_only" }),
        " are shown and saved. Others use inherited defaults.",
        !hasInheritedModeEditableBlocks ? /* @__PURE__ */ jsxs("span", { className: "mt-1 block font-medium text-amber-800", children: [
          "Every visible block here is ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "always" }),
          " \u2014 add",
          " ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "inherited_and_custom" }),
          " or",
          " ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "inherited_only" }),
          " on blocks in the options JSON (see defaults for ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-white/80 px-1", children: "team_appreciation" }),
          ")."
        ] }) : null
      ] }) : null,
      /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-8", children: blocksToRender.map((block) => /* @__PURE__ */ jsx(
        BlockCard,
        {
          block,
          formState,
          setBlockPath
        },
        block.block_id
      )) })
    ] }),
    schema && /* @__PURE__ */ jsxs("div", { className: "mt-10 space-y-4", children: [
      submitError && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", children: submitError }),
      submitOk && !saveSuccessModal && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900", children: submitOk }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => void handleSubmit(),
            disabled: submitting || !saveEnabled,
            className: "inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60",
            children: submitting ? "Submitting\u2026" : "Submit configuration"
          }
        ),
        !saveEnabled ? /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "Add badge_id, to_create, or open a corporate/category config link to enable save." }) : null,
        !standaloneConfigEdit && toCreate && !badgeId ? /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-500", children: [
          "Creating a new badge: upsert runs with ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "to_create=true" }),
          " ",
          "and an empty ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "badge_id" }),
          " until the server assigns an id."
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs("details", { className: "rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm", children: [
        /* @__PURE__ */ jsx("summary", { className: "cursor-pointer font-semibold text-gray-800", children: "Debug: API payload (upsert config)" }),
        /* @__PURE__ */ jsxs("p", { className: "mt-2 text-xs text-gray-500", children: [
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "multi_select_search" }),
          " fields serialize to numeric id arrays. Program image uploads go as multipart ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "icon_image" }),
          ", not inside",
          " ",
          /* @__PURE__ */ jsx("code", { className: "rounded bg-gray-100 px-1", children: "config" }),
          "."
        ] }),
        /* @__PURE__ */ jsx("pre", { className: "mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100", children: JSON.stringify(
          buildProgramConfigApiPayload(
            formState,
            schema.blocks,
            upsertPayloadBlockFilter(formState, schema.blocks)
          ),
          null,
          2
        ) })
      ] })
    ] }),
    saveSuccessModal && /* @__PURE__ */ jsx("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "save-success-title",
      children: /* @__PURE__ */ jsx("div", {
        className: "w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl",
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4", children: [
          /* @__PURE__ */ jsx("h2", { id: "save-success-title", className: "text-lg font-semibold text-gray-900", children: "Saved" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600", children: saveSuccessModal.message }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800",
              onClick: () => {
                setSaveSuccessModal(null);
                navigate(postSaveHref);
              },
              children: "OK"
            }
          )
        ] })
      })
    })
  ] });
}
export {
  ProgramFormPage as default
};
