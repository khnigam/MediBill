import React, { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} />
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <main
        className={
          "min-h-screen pt-16 transition-[padding] duration-200 ease-out " +
          (sidebarCollapsed ? "pl-16" : "pl-64")
        }
      >
        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
