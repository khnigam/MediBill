import React from "react";
import { Link } from "react-router-dom";
import { useCorporateIdInput } from "./useCorporateIdInput";

/**
 * Entry step: choose award program type before hitting appreciation_config APIs.
 * Corporate id is stored in the URL so non-monetary, monetary, and form steps share it.
 */
export default function ProgramAwardTypePage() {
  const { draft, setDraft, commitDraftToUrl, q } = useCorporateIdInput();

  return (
    <div className="min-w-0 w-full max-w-5xl">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appreciation configuration</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Pick which award program you want to configure. Set corporate id first; it is carried on the URL for every
            step.
          </p>
        </div>
        <label className="flex flex-col text-xs font-medium text-gray-700">
          Corporate ID
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="mt-1 w-36 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to={`/program-config/non-monetary?${q}`}
          className="group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-900 hover:shadow-md"
        >
          <span className="text-lg font-semibold text-gray-900 group-hover:underline">Non-monetary awards</span>
          <p className="mt-2 text-sm text-gray-600">
            Browse categories (when enabled) and badges, then open the program form for a selected badge.
          </p>
        </Link>
        <Link
          to={`/program-config/monetary?${q}`}
          className="group flex flex-col rounded-xl border-2 border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-900 hover:shadow-md"
        >
          <span className="text-lg font-semibold text-gray-900 group-hover:underline">Monetary awards</span>
          <p className="mt-2 text-sm text-gray-600">Monetary appreciation flows (placeholder until API is wired).</p>
        </Link>
      </div>
    </div>
  );
}
