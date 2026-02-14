import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Utensils, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TableSelection() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      await axios.post(`${API}/init-data`);
      const response = await axios.get(`${API}/tables`);
      setTables(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error initializing data:", error);
      toast.error("Failed to load tables");
      setLoading(false);
    }
  };

  const selectTable = (tableNumber) => {
    navigate(`/table/${tableNumber}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Hero Section */}
      <div className="relative h-[40vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1765448054070-0a37ade9477e?q=80&w=2000&auto=format&fit=crop')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/80"></div>
        </div>
        <div className="relative h-full flex flex-col items-center justify-center text-white px-4">
          <Utensils className="h-16 w-16 mb-4 text-primary" />
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-3">
            Smart Dine
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-center max-w-2xl">
            Welcome to the future of dining. Select your table to begin your culinary journey.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Select Your Table</h2>
          <p className="text-muted-foreground text-lg">Choose from our available tables</p>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
          {tables.map((table) => (
            <button
              key={table.tableNumber}
              data-testid={`table-${table.tableNumber}-btn`}
              onClick={() => selectTable(table.tableNumber)}
              className="group relative bg-card rounded-2xl p-6 border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-hover hover:scale-105 active:scale-95"
            >
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {table.tableNumber}
                </div>
                <div className="text-sm text-muted-foreground mb-1">Table</div>
                <div className="text-xs text-foreground/70 truncate">
                  {table.waiterName}
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>
            </button>
          ))}
        </div>

        {/* Menu Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Browse Menu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Button
              onClick={() => navigate("/veg")}
              className="h-24 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              data-testid="veg-menu-btn"
            >
              <span className="text-3xl">🥗</span>
              <span className="font-semibold">Veg</span>
            </Button>
            <Button
              onClick={() => navigate("/non-veg")}
              className="h-24 bg-red-600 hover:bg-red-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              data-testid="non-veg-menu-btn"
            >
              <span className="text-3xl">🍖</span>
              <span className="font-semibold">Non-Veg</span>
            </Button>
            <Button
              onClick={() => navigate("/starters")}
              className="h-24 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              data-testid="starters-menu-btn"
            >
              <span className="text-3xl">🍤</span>
              <span className="font-semibold">Starters</span>
            </Button>
            <Button
              onClick={() => navigate("/breakfast")}
              className="h-24 bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
              data-testid="breakfast-menu-btn"
            >
              <span className="text-3xl">🍳</span>
              <span className="font-semibold">Breakfast</span>
            </Button>
          </div>
        </div>

        {/* Kitchen & Admin Access */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            data-testid="kitchen-dashboard-btn"
            onClick={() => navigate("/kitchen")}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-6 font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          >
            <ChefHat className="mr-2 h-5 w-5" />
            Kitchen Dashboard
          </Button>
          <Button
            data-testid="admin-panel-btn"
            onClick={() => navigate("/admin")}
            size="lg"
            variant="outline"
            className="rounded-full px-8 py-6 font-medium transition-all hover:scale-105 active:scale-95"
          >
            Admin Panel
          </Button>
        </div>
      </div>
    </div>
  );
}
