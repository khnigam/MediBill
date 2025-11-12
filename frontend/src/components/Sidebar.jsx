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
  { label: "Dashboard", icon: <MdDashboard size={20} />, key: "dashboard",path: "/purchase"  },
  { label: "Medicines", icon: <MdLocalPharmacy size={20} />, key: "medicines" ,path: "/purchase"},
  { label: "Suppliers", icon: <MdLocalShipping size={20} />, key: "suppliers" ,path: "/purchase"},
  { label: "Customers", icon: <MdPeople size={20} />, key: "customers" ,path: "/purchase"},
  { label: "Purchases", icon: <MdShoppingCart size={20} />, key: "purchase" ,path: "/purchase"},
  { label: "Add Purchase", icon: <MdShoppingCart size={20} />, key: "add_purchase" ,path: "/purchase"},
  { label: "Sales", icon: <MdAttachMoney size={20} />, key: "sales",path: "/purchase" },
    { label: "Add Sale", icon: <MdAttachMoney size={20} />, key: "add_sale",path: "/sale" },
  { label: "Reports", icon: <MdBarChart size={20} />, key: "reports",path: "/purchase" },
];

export default function Sidebar() {
  return (
    <aside
      id="app-sidebar"
      className="fixed top-0 left-0 h-full w-64 bg-white border-r shadow-lg z-30"
    >
      <div>
        <nav className="mt-6">
          <ul>
            {menuItems.map(({ label, icon, key, path }) => (
              <li key={key}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 cursor-pointer rounded-l-lg transition ${
                      isActive
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 text-gray-600 flex items-center gap-3 cursor-pointer hover:text-gray-900 hover:bg-gray-100 rounded-l-lg">
        <MdSettings size={20} />
        <span>Settings</span>
      </div>
    </aside>
  );
}