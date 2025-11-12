import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import Purchase from "./pages/Purchase";
import Sale from "./pages/Sale";

export default function App() {
  return (
          <Router>
            <Header />
            <Routes>
              <Route path="/" element={
                  <div className="min-h-screen bg-gray-50 pt-16">
                                             <main className="ml-64 p-4">
                                               <Dashboard />
                                             </main>
                                           </div>
                                           } />
              <Route path="/purchase" element={<Purchase />} />
              <Route path="/sale" element={<Sale />} />
            </Routes>
          </Router>


  );
}