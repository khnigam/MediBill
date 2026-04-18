import React from "react";
import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdLocalPharmacy,
  MdLocalShipping,
  MdPeople,
  MdShoppingCart,
  MdAttachMoney,
  MdBarChart,
  MdSettings,
} from "react-icons/md";

const menuItems = [
  { label: "Dashboard", icon: <MdDashboard size={20} />, key: "dashboard", path: "/" },
  { label: "Medicines", icon: <MdLocalPharmacy size={20} />, key: "medicines", path: "/medicines" },
  { label: "Suppliers", icon: <MdLocalShipping size={20} />, key: "suppliers", path: "/suppliers" },
  { label: "Customers", icon: <MdPeople size={20} />, key: "customers", path: "/customers" },
  { label: "Purchases", icon: <MdShoppingCart size={20} />, key: "purchase", path: "/purchases" },
  { label: "Add Purchase", icon: <MdShoppingCart size={20} />, key: "add_purchase", path: "/purchase" },
  { label: "Sales", icon: <MdAttachMoney size={20} />, key: "sales", path: "/sales" },
  { label: "Add Sale", icon: <MdAttachMoney size={20} />, key: "add_sale", path: "/sale" },
  { label: "Reports", icon: <MdBarChart size={20} />, key: "reports", path: "/purchases" },
  {
    label: "Program config",
    icon: <MdSettings size={20} />,
    key: "program_config",
    path: "/program-config",
  },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside
      id="app-sidebar"
      className={
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white shadow-lg transition-[width] duration-200 ease-out " +
        (collapsed ? "w-16" : "w-64")
      }
    >
      <div
        className={
          "flex h-16 shrink-0 items-center border-b border-gray-100 font-bold text-gray-800 " +
          (collapsed ? "justify-center px-0 text-sm" : "px-4")
        }
        title="MediBill"
      >
        {collapsed ? "M" : "MediBill"}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5">
          {menuItems.map(({ label, icon, key, path }) => (
            <li key={key}>
              <NavLink
                to={path}
                end={path === "/"}
                title={label}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-r-lg py-2.5 text-sm transition",
                    collapsed ? "justify-center px-0" : "px-4",
                    isActive
                      ? "bg-blue-100 font-semibold text-blue-700"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                <span className="shrink-0">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div
        className={
          "mt-auto flex cursor-pointer items-center gap-3 border-t border-gray-200 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 " +
          (collapsed ? "justify-center px-0" : "px-4")
        }
        title="Settings"
      >
        <MdSettings size={20} className="shrink-0" />
        {!collapsed && <span className="text-sm">Settings</span>}
      </div>
    </aside>
  );
}
