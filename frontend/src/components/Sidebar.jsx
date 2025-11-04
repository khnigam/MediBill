import React from "react";
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
  { label: "Dashboard", icon: <MdDashboard size={20} />, key: "dashboard" },
  { label: "Medicines", icon: <MdLocalPharmacy size={20} />, key: "medicines" },
  { label: "Suppliers", icon: <MdLocalShipping size={20} />, key: "suppliers" },
  { label: "Customers", icon: <MdPeople size={20} />, key: "customers" },
  { label: "Purchases", icon: <MdShoppingCart size={20} />, key: "purchases" },
  { label: "Sales", icon: <MdAttachMoney size={20} />, key: "sales" },
  { label: "Reports", icon: <MdBarChart size={20} />, key: "reports" },
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
            {menuItems.map(({ label, icon, key }) => (
              <li
                key={key}
                className="flex items-center gap-3 px-6 py-3 cursor-pointer text-gray-700 hover:bg-gray-100 rounded-l-lg"
              >
                {icon}
                <span>{label}</span>
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