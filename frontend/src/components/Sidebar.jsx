import React, { useEffect } from "react";

export default function Sidebar() {
  useEffect(() => {
    console.log("Sidebar React component mounted");
  }, []);

  return (
    <aside id="app-sidebar" className="fixed left-0 top-0 h-screen w-64 bg-white border-r z-50">
      <div style={{padding:16}}>DEBUG SIDEBAR - Stitch</div>
    </aside>
  );
}