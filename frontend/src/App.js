import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TableSelection from "./pages/TableSelection";
import CustomerView from "./pages/CustomerView";
import KitchenDashboard from "./pages/KitchenDashboard";
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
