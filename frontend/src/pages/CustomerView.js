import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Star, Clock, User, Plus, Minus, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const categories = ["Pizza", "Burgers", "Indian", "Odisha Special", "Desserts", "Drinks"];

// Format price in INR
const formatPrice = (price) => {
  return `₹${Math.round(price)}`;
};

export default function CustomerView() {
  const { tableNumber } = useParams();
  const [activeCategory, setActiveCategory] = useState("Pizza");
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [tableInfo, setTableInfo] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [orderHistory, setOrderHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(checkOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [tableNumber]);

  const fetchData = async () => {
    try {
      const [menuRes, tableRes, ordersRes] = await Promise.all([
        axios.get(`${API}/menu`),
        axios.get(`${API}/tables/${tableNumber}`),
        axios.get(`${API}/orders/table/${tableNumber}`)
      ]);
      setMenuItems(menuRes.data);
      setTableInfo(tableRes.data);
      setOrderHistory(ordersRes.data);
      
      const activeOrder = ordersRes.data.find(o => 
        ["ordered", "accepted", "preparing", "ready"].includes(o.status)
      );
      setCurrentOrder(activeOrder);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load menu");
    }
  };

  const checkOrderStatus = async () => {
    if (!currentOrder) return;
    try {
      const res = await axios.get(`${API}/orders/${currentOrder.orderId}`);
      setCurrentOrder(res.data);
      if (res.data.status === "served" && !showRating) {
        setTimeout(() => setShowRating(true), 1000);
      }
    } catch (error) {
      console.error("Error checking order status:", error);
    }
  };

  const addToCart = (item) => {
    if (!item.availability) {
      toast.error("Item is currently unavailable");
      return;
    }
    
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success("Added to cart");
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + change;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (currentOrder) {
      toast.error("Please wait for current order to complete");
      return;
    }

    try {
      const orderData = {
        tableNumber: parseInt(tableNumber),
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount: getTotalAmount(),
        waiterName: tableInfo?.waiterName || "N/A"
      };

      const res = await axios.post(`${API}/orders`, orderData);
      setCurrentOrder(res.data);
      setCart([]);
      setShowCart(false);
      setShowCheckout(false);
      toast.success("Order placed successfully!");
      fetchData();
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    }
  };

  const simulatePayment = async () => {
    if (!currentOrder) return;
    
    try {
      await axios.put(`${API}/orders/${currentOrder.orderId}/payment`);
      toast.success("Payment successful!");
      setShowCheckout(false);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Payment failed");
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      await axios.post(`${API}/ratings`, {
        orderId: currentOrder.orderId,
        tableNumber: parseInt(tableNumber),
        rating,
        feedback
      });
      
      await axios.put(`${API}/orders/${currentOrder.orderId}/status`, {
        status: "completed"
      });
      
      toast.success("Thank you for your feedback!");
      setShowRating(false);
      setRating(0);
      setFeedback("");
      setCurrentOrder(null);
      fetchData();
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    }
  };

  const filteredItems = menuItems.filter(item => item.category === activeCategory);

  const getStatusColor = (status) => {
    const colors = {
      ordered: "bg-blue-500",
      accepted: "bg-yellow-500",
      preparing: "bg-orange-500",
      ready: "bg-green-500",
      served: "bg-purple-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusText = (status) => {
    const texts = {
      ordered: "Order Received",
      accepted: "Accepted by Kitchen",
      preparing: "Being Prepared",
      ready: "Ready for Pickup",
      served: "Served"
    };
    return texts[status] || status;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Smart Dine</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="font-medium">Table {tableNumber}</span>
                {tableInfo && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {tableInfo.waiterName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                data-testid="view-history-btn"
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="rounded-full"
              >
                <Clock className="h-4 w-4 mr-1" />
                History
              </Button>
              <Button
                data-testid="cart-btn"
                onClick={() => setShowCart(true)}
                className="relative rounded-full bg-primary hover:bg-primary/90"
                size="sm"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Banner */}
      {currentOrder && (
        <div className={`${getStatusColor(currentOrder.status)} text-white py-4 px-4 fade-in`}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <div>
                <div className="font-semibold">{getStatusText(currentOrder.status)}</div>
                <div className="text-sm opacity-90">Order #{currentOrder.orderId.slice(0, 8)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">formatPrice(currentOrder.totalAmount)</div>
              {!currentOrder.isPaid && currentOrder.status === "ready" && (
                <Button
                  data-testid="pay-now-btn"
                  size="sm"
                  onClick={() => setShowCheckout(true)}
                  className="mt-1 bg-white text-primary hover:bg-white/90 rounded-full"
                >
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="sticky top-[73px] z-30 bg-background border-b border-border">
        <div className="overflow-x-auto w-full whitespace-nowrap">
          <div className="flex gap-2 p-4 container mx-auto">
            {categories.map(category => (
              <button
                key={category}
                data-testid={`category-${category.toLowerCase()}-tab`}
                onClick={() => setActiveCategory(category)}
                className={`category-tab px-6 py-3 rounded-full font-medium ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground active"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
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
                  <Badge
                    variant={item.availability ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {item.availability ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    ${item.price.toFixed(2)}
                  </span>
                  <Button
                    data-testid={`add-to-cart-${item.id}-btn`}
                    onClick={() => addToCart(item)}
                    disabled={!item.availability}
                    size="sm"
                    className="rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          ></div>
          <div className="cart-drawer relative bg-card w-full md:w-[500px] h-full md:h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Cart</h2>
              <Button
                data-testid="close-cart-btn"
                variant="ghost"
                size="sm"
                onClick={() => setShowCart(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      data-testid={`cart-item-${item.id}`}
                      className="flex gap-4 p-4 bg-muted/50 rounded-xl"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{item.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          ${item.price.toFixed(2)} each
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`decrease-qty-${item.id}-btn`}
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="quantity-button h-8 w-8 p-0 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            data-testid={`increase-qty-${item.id}-btn`}
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="quantity-button h-8 w-8 p-0 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            data-testid={`remove-item-${item.id}-btn`}
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                            className="ml-auto rounded-full"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-border bg-card">
                <div className="flex items-center justify-between mb-4 text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ${getTotalAmount().toFixed(2)}
                  </span>
                </div>
                <Button
                  data-testid="place-order-btn"
                  onClick={placeOrder}
                  disabled={currentOrder !== null}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                >
                  Place Order
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCheckout(false)}
          ></div>
          <div className="relative bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">Payment</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-lg">
                <span>Order Total</span>
                <span className="font-bold">formatPrice(currentOrder.totalAmount)</span>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  This is a simulated payment for demonstration purposes
                </p>
              </div>
            </div>
            <Button
              data-testid="confirm-payment-btn"
              onClick={simulatePayment}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-lg font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Confirm Payment
            </Button>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">Rate Your Experience</h2>
            <div className="mb-6">
              <p className="text-center text-muted-foreground mb-4">
                How was your meal?
              </p>
              <div className="star-rating flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    data-testid={`star-${star}`}
                    className={`h-12 w-12 cursor-pointer ${
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Share your feedback (optional)
              </label>
              <Textarea
                data-testid="feedback-input"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={4}
                className="rounded-xl"
              />
            </div>
            <Button
              data-testid="submit-rating-btn"
              onClick={submitRating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6 text-lg font-semibold transition-all hover:scale-105 active:scale-95"
            >
              Submit Rating
            </Button>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowHistory(false)}
          ></div>
          <div className="relative bg-card rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Order History</h2>
              <Button
                data-testid="close-history-btn"
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {orderHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orderHistory.map(order => (
                  <div
                    key={order.orderId}
                    data-testid={`history-order-${order.orderId}`}
                    className="p-4 bg-muted/50 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">
                          Order #{order.orderId.slice(0, 8)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {order.items.length} items
                    </div>
                    <div className="font-bold text-lg text-primary">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
