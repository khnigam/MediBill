import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { corporateIdQueryString, parseCorporateIdParam } from "./corporateIdSearchParam";
import {
  fetchAppreciationConfigCurrent,
  parseAppreciationConfigCurrentResponse,
  type AppreciationConfigCurrentData,
} from "./appreciationConfigApi";
import { mergeAppreciationCurrentLayers } from "../config-form/programFormLogic";

function isTruthyParam(v: string | null): boolean {
  return v === "1" || v === "true";
}

function layerKeyCount(layer: Record<string, unknown>): number {
  return Object.keys(layer).length;
}

export default function ProgramConfigPreviewPage() {
  const [searchParams] = useSearchParams();
  const corporateId = useMemo(
    () => parseCorporateIdParam(searchParams.get("corporate_id")),
    [searchParams]
  );
  const badgeId = (searchParams.get("badge_id") ?? "").trim();
  const categoryId = (searchParams.get("category_id") ?? "").trim();
  const isCategoryEnabled = isTruthyParam(searchParams.get("is_category_enabled"));

  const [layers, setLayers] = useState<AppreciationConfigCurrentData | null>(null);
  const [merged, setMerged] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
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
      setError("Missing badge_id — open this screen from the awards list.");
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
    })
      .then((raw) => {
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
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message ?? "Failed to load");
          setLayers(null);
          setMerged({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [badgeId, categoryId, corporateId]);

  useEffect(() => {
    return load();
  }, [load]);

  const hasAnyLayer =
    layers != null &&
    (layerKeyCount(layers.corporate) > 0 ||
      layerKeyCount(layers.category) > 0 ||
      layerKeyCount(layers.award) > 0);

  return (
    <div className="min-w-0 w-full max-w-5xl">
      <p className="mb-2 text-sm">
        <Link
          to={`/program-config/non-monetary?${corporateIdQueryString(corporateId)}`}
          className="font-medium text-gray-700 underline hover:text-gray-900"
        >
          ← Non-monetary awards
        </Link>
      </p>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuration preview</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Effective config merges <strong>corporate</strong> → <strong>category</strong> (when{" "}
          <code className="rounded bg-gray-100 px-1">category_id</code> is set) → <strong>award</strong>. Source:{" "}
          <code className="rounded bg-gray-100 px-1">GET /appreciation_config/current</code>.
          {!isCategoryEnabled ? (
            <span className="block mt-1 text-gray-500">
              Category list is off for this corporate; the form will hide the program category dropdown.
            </span>
          ) : null}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading saved layers…</p>}

      {!loading && layers && (
        <>
          {!hasAnyLayer && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              No saved configuration yet — use <strong>Modify</strong> to create one. The program name can be prefilled
              from the awards list.
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-3">
            {(["corporate", "category", "award"] as const).map((key) => (
              <section key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold capitalize text-gray-800">{key} layer</h2>
                <p className="mt-1 text-xs text-gray-500">{layerKeyCount(layers[key])} top-level keys</p>
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-[11px] leading-relaxed text-gray-100">
                  {JSON.stringify(layers[key], null, 2)}
                </pre>
              </section>
            ))}
          </div>
          <section className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-900">Merged (effective) config</h2>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(merged, null, 2)}
            </pre>
          </section>
        </>
      )}

      {!loading && badgeId && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/program-config/form?${formQuery}`}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
          >
            Modify
          </Link>
        </div>
      )}
    </div>
  );
}
