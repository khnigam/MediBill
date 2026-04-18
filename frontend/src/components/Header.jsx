import React from "react";
import { NavLink } from "react-router-dom";

export default function Header({ onToggleSidebar, sidebarCollapsed }) {
  return (
    <header
      className={
        "fixed top-0 right-0 z-50 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur transition-[left] duration-200 ease-out sm:px-6 " +
        (sidebarCollapsed ? "left-16" : "left-64")
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-lg leading-none" aria-hidden>
              ≡
            </span>
          </button>
        )}
        <NavLink
          to="/"
          className="shrink-0 select-none text-lg font-semibold text-gray-900 transition hover:text-blue-600 whitespace-nowrap"
        >
          Stitch&nbsp;–&nbsp;Design
        </NavLink>

        <div className="mx-2 min-w-0 flex-1 max-w-3xl">
          <div className="relative">
            <input
              type="search"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-4 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Search for medicines, suppliers..."
              aria-label="Global search"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 sm:inline-flex sm:items-center sm:gap-2"
        >
          + New Sale
        </button>
        <button
          type="button"
          className="rounded-full border border-gray-200 bg-white p-2 hover:bg-gray-50"
          aria-label="Notifications"
        >
          🔔
        </button>
        <div
          className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-orange-200 to-orange-400"
          aria-hidden
        />
      </div>
    </header>
  );
}
