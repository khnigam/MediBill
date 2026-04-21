import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BlockCard } from "./BlockCard";
import { ProgramFormRemoteContext } from "./ProgramFormRemoteContext";
import { fetchProgramFormSchema } from "./schemaApi";
import type { SchemaDoc } from "./types";
import {
  buildProgramConfigApiPayload,
  buildProgramConfigApiPayloadWithEmbeddedFiles,
  effectiveConfigScopeVisibility,
  filterBlocksForConfigScope,
  filterProgramSchemaForCategoryVisibility,
  isBlockVisibleForConfigScope,
  isInheritedCorporateOrCategoryMode,
  mergeAppreciationCurrentLayers,
  upsertPayloadBlockFilter,
} from "./programFormLogic";
import { useProgramFormState } from "./useProgramFormState";
import { corporateIdQueryString, parseCorporateIdParam } from "../program-config-advantage/corporateIdSearchParam";
import {
  fetchAppreciationConfigCurrent,
  parseAppreciationConfigCurrentResponse,
  upsertAppreciationConfig,
} from "../program-config-advantage/appreciationConfigApi";

function isTruthyQueryParam(v: string | null): boolean {
  return v === "1" || v === "true";
}

function safeDecodeURIComponent(raw: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseUpsertResult(res: unknown): { ok: true; message?: string } | { ok: false; message: string } {
  if (!res || typeof res !== "object" || Array.isArray(res)) return { ok: true };
  const o = res as Record<string, unknown>;
  if (o.success === false) {
    let msg = typeof o.message === "string" ? o.message : "Save failed";
    if (Array.isArray(o.errors)) msg = `${msg}: ${o.errors.map(String).join("; ")}`;
    return { ok: false, message: msg };
  }
  if (o.success === true && typeof o.message === "string") return { ok: true, message: o.message };
  return { ok: true };
}

export default function ProgramFormPage() {
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

  const previewBackQuery = useMemo(() => {
    const q = new URLSearchParams(searchParams);
    q.delete("from_preview");
    return q.toString();
  }, [searchParams]);

  const [schema, setSchema] = useState<SchemaDoc | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { formState, initializeFromSchemaAndMerged, setBlockPath } = useProgramFormState();

  const narrowInheritedMode = isInheritedCorporateOrCategoryMode(formState);

  const blocksToRender = useMemo(() => {
    if (!schema) return [];
    return filterBlocksForConfigScope(formState, schema.blocks);
  }, [formState, schema]);

  /** In Corporate/Category mode, warn if only "always" blocks (e.g. scope) would show — no inherited-editable sections. */
  const hasInheritedModeEditableBlocks = useMemo(() => {
    if (!schema) return true;
    return schema.blocks.some(
      (b) =>
        isBlockVisibleForConfigScope(b, true) && effectiveConfigScopeVisibility(b) !== "always"
    );
  }, [schema]);

  const initKey = useMemo(
    () =>
      [
        corporateId,
        badgeId,
        categoryId,
        isCategoryEnabled ? "1" : "0",
        awardNameQuery,
        toCreate ? "1" : "0",
      ].join("|"),
    [corporateId, badgeId, categoryId, isCategoryEnabled, awardNameQuery, toCreate]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setConfigLoadError(null);
    (async () => {
      let doc: SchemaDoc;
      try {
        doc = await fetchProgramFormSchema();
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load schema");
        return;
      }
      if (cancelled) return;
      const filtered = filterProgramSchemaForCategoryVisibility(doc, isCategoryEnabled);
      setSchema(filtered);
      let merged: Record<string, unknown> = {};
      if (badgeId) {
        try {
          const raw = await fetchAppreciationConfigCurrent({
            corporateId,
            badgeId,
            categoryId: categoryId || null,
          });
          const parsed = parseAppreciationConfigCurrentResponse(raw);
          if (!parsed?.success) {
            if (!cancelled) setConfigLoadError(parsed?.info ?? "Could not load saved configuration.");
          } else if (parsed.data) {
            merged = mergeAppreciationCurrentLayers(parsed.data);
          }
        } catch (e) {
          if (!cancelled) setConfigLoadError(e instanceof Error ? e.message : "Failed to load current config");
        }
      }
      if (cancelled) return;
      initializeFromSchemaAndMerged(filtered.blocks, merged, {
        defaultAwardName: awardNameQuery || undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    initKey,
    corporateId,
    badgeId,
    categoryId,
    isCategoryEnabled,
    awardNameQuery,
    toCreate,
    initializeFromSchemaAndMerged,
  ]);

  async function handleSubmit() {
    if (!schema) return;
    if (!toCreate && !badgeId) {
      setSubmitError("badge_id is required to save (open this form from the awards list or preview).");
      return;
    }
    if (toCreate && isCategoryEnabled && !categoryId) {
      setSubmitError("category_id is required when creating a badge while category mode is enabled.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(null);
    try {
      const payloadBlockIds = upsertPayloadBlockFilter(formState, schema.blocks);
      const config = await buildProgramConfigApiPayloadWithEmbeddedFiles(
        formState,
        schema.blocks,
        payloadBlockIds
      );
      const res = await upsertAppreciationConfig({
        corporate_id: corporateId,
        badge_id: badgeId || null,
        category_id: categoryId || null,
        to_create: toCreate,
        config,
      });
      const parsed = parseUpsertResult(res);
      if (!parsed.ok) {
        setSubmitError(parsed.message);
        return;
      }
      setSubmitOk(
        parsed.message ?? (res == null ? "Saved (empty response)." : JSON.stringify(res).slice(0, 400))
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  const listHref = `/program-config/non-monetary?${corporateIdQueryString(corporateId)}`;
  const backHref = fromPreview ? `/program-config/preview?${previewBackQuery}` : listHref;
  const backLabel = fromPreview ? "← Preview" : "← Non-monetary awards";

  return (
    <div className="min-w-0 w-full max-w-5xl">
      <header className="mb-8">
        <p className="mb-2 text-sm">
          <Link to={backHref} className="font-medium text-gray-700 underline hover:text-gray-900">
            {backLabel}
          </Link>
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Program configuration</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Schema from <code className="rounded bg-gray-100 px-1">/appreciation_config/options</code> (including{" "}
          <code className="rounded bg-gray-100 px-1">config_options</code> for configuration scope). Saved layers load
          from <code className="rounded bg-gray-100 px-1">GET /appreciation_config/current</code> (merged into the
          form). Submit uses <code className="rounded bg-gray-100 px-1">POST /appreciation_config/upsert</code> with{" "}
          <code className="rounded bg-gray-100 px-1">to_create</code> from the URL (
          <code className="rounded bg-gray-100 px-1">to_create=1</code> when creating a new award row). Set{" "}
          <code className="rounded bg-gray-100 px-1">REACT_APP_ADVANTAGE_CONFIG_TOKEN</code> in{" "}
          <code className="rounded bg-gray-100 px-1">.env.local</code>.
        </p>
      </header>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}

      {configLoadError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {configLoadError} (form started from defaults where needed.)
        </div>
      )}

      {!schema && !loadError && <p className="text-sm text-gray-500">Loading configuration schema…</p>}

      {schema && (
        <ProgramFormRemoteContext.Provider value={schema.external_datasources ?? null}>
          {narrowInheritedMode ? (
            <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
              <strong>Corporate / category mode:</strong> only blocks with{" "}
              <code className="rounded bg-white/80 px-1">config_scope_visibility</code> of{" "}
              <code className="rounded bg-white/80 px-1">always</code>,{" "}
              <code className="rounded bg-white/80 px-1">inherited_and_custom</code>, or{" "}
              <code className="rounded bg-white/80 px-1">inherited_only</code> are shown and saved. Others use
              inherited defaults.
              {!hasInheritedModeEditableBlocks ? (
                <span className="mt-1 block font-medium text-amber-800">
                  Every visible block here is <code className="rounded bg-white/80 px-1">always</code> — add{" "}
                  <code className="rounded bg-white/80 px-1">inherited_and_custom</code> or{" "}
                  <code className="rounded bg-white/80 px-1">inherited_only</code> on blocks in the options JSON (see
                  defaults for <code className="rounded bg-white/80 px-1">team_appreciation</code>).
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-8">
            {blocksToRender.map((block) => (
              <BlockCard
                key={block.block_id}
                block={block}
                formState={formState}
                setBlockPath={setBlockPath}
              />
            ))}
          </div>
        </ProgramFormRemoteContext.Provider>
      )}

      {schema && (
        <div className="mt-10 space-y-4">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{submitError}</div>
          )}
          {submitOk && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              {submitOk}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                submitting ||
                (!badgeId && !toCreate) ||
                (toCreate && isCategoryEnabled && !categoryId)
              }
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit configuration"}
            </button>
            {!badgeId && !toCreate ? (
              <span className="text-xs text-gray-500">Add badge_id to the URL to enable save.</span>
            ) : null}
            {toCreate && !badgeId ? (
              <span className="text-xs text-gray-500">
                Creating a new badge: upsert runs with <code className="rounded bg-gray-100 px-1">to_create=true</code>{" "}
                and an empty <code className="rounded bg-gray-100 px-1">badge_id</code> until the server assigns an id.
              </span>
            ) : null}
          </div>
          <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-semibold text-gray-800">Debug: API payload (upsert config)</summary>
            <p className="mt-2 text-xs text-gray-500">
              <code className="rounded bg-gray-100 px-1">multi_select_search</code> fields serialize to numeric id
              arrays. New image files are embedded as data URLs in <code className="rounded bg-gray-100 px-1">config</code>{" "}
              for JSON upsert.
            </p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(
                buildProgramConfigApiPayload(
                  formState,
                  schema.blocks,
                  upsertPayloadBlockFilter(formState, schema.blocks)
                ),
                null,
                2
              )}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
