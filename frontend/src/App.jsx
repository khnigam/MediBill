import React from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

/*
  Sidebar is fixed (w-64). Main content offset with ml-64 so sidebar is always visible.
*/
export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Dashboard />
      </div>
    </div>
  );
}