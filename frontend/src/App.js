import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TableSelection from "./pages/TableSelection";
import CustomerView from "./pages/CustomerView";
import KitchenDashboard from "./pages/KitchenDashboard";
import AdminPanel from "./pages/AdminPanel";
import VegPage from "./pages/VegPage";
import NonVegPage from "./pages/NonVegPage";
import StartersPage from "./pages/StartersPage";
import BreakfastPage from "./pages/BreakfastPage";
import CartPage from "./pages/CartPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="App">
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TableSelection />} />
          <Route path="/table/:tableNumber" element={<CustomerView />} />
          <Route path="/kitchen" element={<KitchenDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/veg" element={<VegPage />} />
          <Route path="/non-veg" element={<NonVegPage />} />
          <Route path="/starters" element={<StartersPage />} />
          <Route path="/breakfast" element={<BreakfastPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
