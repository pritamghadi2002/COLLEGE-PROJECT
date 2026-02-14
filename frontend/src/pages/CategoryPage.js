import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Home, ShoppingCart, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => `₹${Math.round(price)}`;

export default function CategoryPage({ vegType, title, description }) {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem("smartDineCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    
    fetchMenuItems();
  }, [vegType]);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API}/menu`);
      const filtered = res.data.filter(item => item.vegType === vegType && item.availability);
      setMenuItems(filtered);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching menu:", error);
      toast.error("Failed to load menu items");
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    let newCart;
    
    if (existing) {
      newCart = cart.map(i =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newCart = [...cart, { ...item, quantity: 1 }];
    }
    
    setCart(newCart);
    localStorage.setItem("smartDineCart", JSON.stringify(newCart));
    toast.success("Added to cart");
  };

  const updateQuantity = (itemId, change) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    
    setCart(newCart);
    localStorage.setItem("smartDineCart", JSON.stringify(newCart));
  };

  const getCartItemQuantity = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/cart")}
                className="relative rounded-full bg-primary"
                data-testid="cart-btn"
              >
                <ShoppingCart className="h-5 w-5" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="rounded-full"
                data-testid="home-btn"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-8">
        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map(item => {
              const quantity = getCartItemQuantity(item.id);
              return (
                <div
                  key={item.id}
                  data-testid={`menu-item-${item.id}`}
                  className="menu-item-card group relative overflow-hidden bg-card rounded-2xl border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-hover"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(item.price)}
                      </span>
                      {quantity === 0 ? (
                        <Button
                          data-testid={`add-to-cart-${item.id}-btn`}
                          onClick={() => addToCart(item)}
                          size="sm"
                          className="rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`decrease-qty-${item.id}-btn`}
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold w-8 text-center">{quantity}</span>
                          <Button
                            data-testid={`increase-qty-${item.id}-btn`}
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
