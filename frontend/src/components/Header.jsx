import React from "react";

/*
  Header is sticky within the main content. Its z-index is below the sidebar (z-40 < z-50)
  so it will not overlap the fixed sidebar.
*/
export default function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
      <div className="w-full max-w-3xl">
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