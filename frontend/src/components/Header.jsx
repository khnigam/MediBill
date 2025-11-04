import React from "react";

export default function Header({ onToggleSidebar, sidebarOpen }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-8 border-b border-gray-200 bg-white">
        <div className="px-1 py-10 border-b border-gray-200 font-semibold text-lg text-gray-900 select-none whitespace-nowrap">
          Stitch - Design
        </div>
      <div className="w-full pl-78 max-w-4xl">
        <div className="relative">
          <input
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm"
            placeholder="Search for medicines, suppliers..."
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</div>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        <button className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
          + New Sale
        </button>
        <button className="p-2 rounded-full bg-white border border-gray-200">🔔</button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-400" />
      </div>
    </header>
  );
}