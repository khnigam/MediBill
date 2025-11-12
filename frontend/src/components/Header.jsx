import React from "react";
import clsx from "clsx";
import { NavLink } from "react-router-dom";

export default function Header({ onToggleSidebar, sidebarOpen }) {
  return (
    <header
      className={clsx(
        "fixed top-0 left-0 right-0 z-50",
        "h-16 border-b border-gray-200 bg-white/95 backdrop-blur",
        "flex items-center gap-4 px-4 sm:px-6"
      )}
    >
      {/* Left: Sidebar toggle + brand */}
      <div className="flex items-center gap-10 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="inline-flex items-center justify-center w-16 h-9 rounded-lg border border-gray-200 bg-white shadow-sm"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {/* hamburger */}
            <span className="i-lucide-menu w-10 h-5">≡</span>
          </button>
        )}
        <NavLink
          to="/"
          className="font-semibold text-lg text-gray-900 select-none whitespace-nowrap hover:text-blue-600 transition"
        >
          Stitch&nbsp;–&nbsp;Design
        </NavLink>
      </div>

      {/* Middle: Search (flex-1 to prevent overlap) */}
      <div className="flex-1 max-w-3xl mx-20">
        <div className="relative">
          <input
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            placeholder="Search for medicines, suppliers..."
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-5 ml-2">
        <button className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-8 py-2 rounded-lg shadow-sm hover:bg-gray-50">
          + New Sale
        </button>
        <button
          className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50"
          aria-label="Notifications"
        >
          🔔
        </button>
        <div
         style={{
            marginLeft: "fixed",
            display: "block",
          }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-400"
          aria-hidden
        />
      </div>
    </header>
  );
}
