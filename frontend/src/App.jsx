import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Purchase from "./pages/Purchase";
import PurchaseView from "./pages/PurchaseView";
import Sale from "./pages/Sale";
import Medicines from "./pages/Medicines";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Purchases from "./pages/Recent Purchases";
import Sales from "./pages/Recent Sales";
import ProgramConfigApp from "./program-config-advantage/ProgramConfigApp";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/purchase/view/:id" element={<PurchaseView />} />
          <Route path="/sale" element={<Sale />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/program-config" element={<ProgramConfigApp />} />
        </Route>
      </Routes>
    </Router>
  );
}
