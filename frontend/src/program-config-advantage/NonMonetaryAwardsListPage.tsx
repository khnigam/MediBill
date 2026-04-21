import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { corporateIdQueryString } from "./corporateIdSearchParam";
import { useCorporateIdInput } from "./useCorporateIdInput";
import {
  badgeCategoryId,
  badgeDisplayName,
  badgePrimaryId,
  fetchNonMonetaryAwards,
  parseNonMonetaryAwardsResponse,
  type CategoryCardModel,
  type NonMonetaryAwardsResponse,
} from "./nonMonetaryAwardsApi";

function nonMonetaryConfigPreviewHref(opts: {
  corporateId: number;
  badge: Record<string, unknown>;
  selectedCategoryId: string | null;
  isCategoryEnabled: boolean;
}): string {
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

/**
 * New-badge flow skips preview (no badge_id yet) and opens the form with {@code to_create=1}.
 * When {@code categoryFlowActive}, a category must be chosen so {@code category_id} is sent on upsert.
 */
function newNonMonetaryBadgeFormHref(opts: {
  corporateId: number;
  selectedCategoryId: string | null;
  isCategoryEnabled: boolean;
  categoryFlowActive: boolean;
  canCreateBadge: boolean;
}): string | null {
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

function IconTile({ label, imageUrl }: { label: string; imageUrl?: string | null }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(imageUrl && !broken);
  return (
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100">
      {showImg ? (
        <img
          src={imageUrl as string}
          alt=""
          className="h-full w-full object-contain p-2"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="px-2 text-center text-xs font-medium leading-snug text-gray-600 line-clamp-3">{label}</span>
      )}
    </div>
  );
}

function SelectionGrid({
  children,
  columns = 3,
}: {
  children: React.ReactNode;
  /** Categories use 3 per row on large screens; badges use 4. */
  columns?: 3 | 4;
}) {
  const cls =
    columns === 4
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
  return <div className={cls}>{children}</div>;
}

export default function NonMonetaryAwardsListPage() {
  const { corporateId, draft, setDraft, commitDraftToUrl } = useCorporateIdInput();

  const [data, setData] = useState<NonMonetaryAwardsResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setParseError(null);
    fetchNonMonetaryAwards(corporateId)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseNonMonetaryAwardsResponse(raw);
        if (!parsed) {
          setParseError("Response was not an object with badges (unexpected shape).");
          setData(null);
          return;
        }
        setData(parsed);
        setSelectedCategoryId(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? "Failed to load awards");
      })
      .finally(() => {
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

  const filteredBadges = useMemo(() => {
    if (!data) return [];
    if (!data.is_category_enabled || !categoryFlowActive) return data.badges;
    if (!selectedCategoryId) return [];
    return data.badges.filter((b) => badgeCategoryId(b) === selectedCategoryId);
  }, [data, selectedCategoryId, categoryFlowActive]);

  const showCategoryPicker =
    categoryFlowActive && (selectedCategoryId === null || selectedCategoryId === "");

  const createNewBadgeHref = useMemo(() => {
    if (!data || loading) return null;
    return newNonMonetaryBadgeFormHref({
      corporateId,
      selectedCategoryId,
      isCategoryEnabled: Boolean(data.is_category_enabled),
      categoryFlowActive,
      canCreateBadge: data.can_create_badge,
    });
  }, [categoryFlowActive, corporateId, data, loading, selectedCategoryId]);

  return (
    <div className="min-w-0 w-full max-w-6xl">
      <p className="mb-2 text-sm">
        <Link
          to={`/program-config?${corporateIdQueryString(corporateId)}`}
          className="font-medium text-gray-700 underline hover:text-gray-900"
        >
          ← Award type
        </Link>
      </p>
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Non-monetary awards</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Data from <code className="rounded bg-gray-100 px-1">GET /appreciation_config/nonomonetary_awards</code> (
            <code className="rounded bg-gray-100 px-1">corporate_id</code> query, default 900). Categories use{" "}
            <code className="rounded bg-gray-100 px-1">is_category_enabled</code>; badges filter by{" "}
            <code className="rounded bg-gray-100 px-1">generic_category_id</code>.
          </p>
        </div>
        <label className="flex flex-col text-xs font-medium text-gray-700">
          Corporate ID
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="mt-1 w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commitDraftToUrl()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Corporate ID"
          />
        </label>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {parseError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {parseError}
        </div>
      )}

      {!loading && data?.is_category_enabled && !categoryFlowActive && data.badges.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Category mode is on but no categories were returned — showing all badges.
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && data && data.is_category_enabled && showCategoryPicker && (
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Categories</h2>
          {data.categoryEntries.length === 0 ? (
            <p className="text-sm text-gray-600">No categories returned for this corporate.</p>
          ) : (
            <SelectionGrid>
              {data.categoryEntries.map((cat: CategoryCardModel) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md"
                >
                  <IconTile label={cat.name} imageUrl={cat.image_icon} />
                  <p className="mt-3 text-sm font-semibold text-gray-900">{cat.name}</p>
                </button>
              ))}
            </SelectionGrid>
          )}
        </section>
      )}

      {!loading && data && data.is_category_enabled && selectedCategoryId && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
            onClick={() => setSelectedCategoryId(null)}
          >
            ← All categories
          </button>
          <span className="text-sm text-gray-500">
            Showing awards in category{" "}
            <span className="font-medium text-gray-800">
              {data.categoryEntries.find((c) => c.id === selectedCategoryId)?.name ?? selectedCategoryId}
            </span>
          </span>
        </div>
      )}

      {!loading && data && (!categoryFlowActive || selectedCategoryId) && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {categoryFlowActive && selectedCategoryId ? "Awards in category" : "All awards"}
            </h2>
            {createNewBadgeHref ? (
              <Link
                to={createNewBadgeHref}
                className="inline-flex w-fit items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 shadow-sm hover:border-indigo-400 hover:bg-indigo-100"
              >
                + Create new badge
              </Link>
            ) : data.is_category_enabled && categoryFlowActive && !selectedCategoryId ? (
              <span className="text-xs text-gray-500">Choose a category above to create a badge in that category.</span>
            ) : null}
          </div>
          {filteredBadges.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {data.is_category_enabled
                  ? "No badges in this category (check generic_category_id on NonmonetaryAward)."
                  : "No badges returned."}
              </p>
              {createNewBadgeHref ? (
                <Link
                  to={createNewBadgeHref}
                  className="inline-flex text-sm font-semibold text-indigo-700 underline hover:text-indigo-900"
                >
                  Create new badge instead →
                </Link>
              ) : null}
            </div>
          ) : (
            <SelectionGrid columns={4}>
              {filteredBadges.map((badge, idx) => {
                const name = badgeDisplayName(badge);
                const icon =
                  typeof badge.image_icon === "string"
                    ? badge.image_icon
                    : typeof (badge as { image_icon_url?: unknown }).image_icon_url === "string"
                      ? ((badge as { image_icon_url: string }).image_icon_url as string)
                      : null;
                const href = nonMonetaryConfigPreviewHref({
                  corporateId,
                  badge,
                  selectedCategoryId,
                  isCategoryEnabled: Boolean(data?.is_category_enabled),
                });
                return (
                  <Link
                    key={badgePrimaryId(badge) ?? idx}
                    to={href}
                    className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-400 hover:shadow-md"
                  >
                    <IconTile label={name} imageUrl={icon} />
                    <p className="mt-3 text-sm font-semibold text-gray-900">{name}</p>
                    <span className="mt-1 text-xs text-gray-500">Configure program →</span>
                  </Link>
                );
              })}
            </SelectionGrid>
          )}
        </section>
      )}
    </div>
  );
}
