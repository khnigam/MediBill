import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Sidebar />
      <main className="ml-64 p-4">
        <Dashboard />
      </main>
    </div>
  );
}