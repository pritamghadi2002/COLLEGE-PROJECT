import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChefHat, Clock, CheckCircle, Home, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        axios.get(`${API}/kitchen/orders`),
        axios.get(`${API}/menu`)
      ]);
      setOrders(ordersRes.data);
      setMenuItems(menuRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching kitchen data:", error);
      toast.error("Failed to load kitchen data");
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const toggleAvailability = async (itemId, currentAvailability) => {
    try {
      await axios.put(`${API}/menu/${itemId}/availability`, {
        availability: !currentAvailability
      });
      toast.success("Availability updated");
      fetchData();
    } catch (error) {
      console.error("Error updating availability:", error);
      toast.error("Failed to update availability");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      ordered: "border-blue-500",
      accepted: "border-yellow-500",
      preparing: "border-orange-500",
      ready: "border-green-500"
    };
    return colors[status] || "border-gray-500";
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      ordered: "bg-blue-500",
      accepted: "bg-yellow-500",
      preparing: "bg-orange-500",
      ready: "bg-green-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMinutes = Math.floor((now - orderTime) / 60000);
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes === 1) return "1 minute ago";
    return `${diffMinutes} minutes ago`;
  };

  const groupedOrders = {
    ordered: orders.filter(o => o.status === "ordered"),
    accepted: orders.filter(o => o.status === "accepted"),
    preparing: orders.filter(o => o.status === "preparing"),
    ready: orders.filter(o => o.status === "ready")
  };

  const categories = [...new Set(menuItems.map(item => item.category))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading kitchen dashboard...</p>
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
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Kitchen Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {orders.length} active orders
                </p>
              </div>
            </div>
            <Button
              data-testid="back-home-btn"
              onClick={() => navigate("/")}
              variant="outline"
              className="rounded-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="orders" data-testid="orders-tab">
              Active Orders
            </TabsTrigger>
            <TabsTrigger value="menu" data-testid="menu-tab">
              Menu Management
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* New Orders Column */}
              <div>
                <div className="bg-blue-500 text-white px-4 py-3 rounded-t-xl font-semibold flex items-center justify-between">
                  <span>New Orders</span>
                  <Badge variant="secondary" className="bg-white text-blue-500">
                    {groupedOrders.ordered.length}
                  </Badge>
                </div>
                <div className="h-[calc(100vh-280px)] bg-muted/20 rounded-b-xl p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {groupedOrders.ordered.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No new orders
                      </p>
                    ) : (
                      groupedOrders.ordered.map(order => (
                        <div
                          key={order.orderId}
                          data-testid={`order-${order.orderId}`}
                          className={`bg-white rounded-lg border-l-4 ${getStatusColor(order.status)} shadow-sm p-4`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-lg">Table {order.tableNumber}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeSince(order.timestamp)}
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(order.status)}>
                              New
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                                <span className="text-muted-foreground">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-border pt-2 mb-3">
                            <div className="flex justify-between font-bold">
                              <span>Total</span>
                              <span className="text-primary">${order.totalAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <Button
                            data-testid={`accept-order-${order.orderId}-btn`}
                            onClick={() => updateOrderStatus(order.orderId, "accepted")}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
                            size="sm"
                          >
                            Accept Order
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Accepted Column */}
              <div>
                <div className="bg-yellow-500 text-white px-4 py-3 rounded-t-xl font-semibold flex items-center justify-between">
                  <span>Accepted</span>
                  <Badge variant="secondary" className="bg-white text-yellow-500">
                    {groupedOrders.accepted.length}
                  </Badge>
                </div>
                <div className="h-[calc(100vh-280px)] bg-muted/20 rounded-b-xl p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {groupedOrders.accepted.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No accepted orders
                      </p>
                    ) : (
                      groupedOrders.accepted.map(order => (
                        <div
                          key={order.orderId}
                          data-testid={`order-${order.orderId}`}
                          className={`bg-white rounded-lg border-l-4 ${getStatusColor(order.status)} shadow-sm p-4`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-lg">Table {order.tableNumber}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeSince(order.timestamp)}
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(order.status)}>
                              Accepted
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            data-testid={`start-preparing-${order.orderId}-btn`}
                            onClick={() => updateOrderStatus(order.orderId, "preparing")}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                            size="sm"
                          >
                            Start Preparing
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Preparing Column */}
              <div>
                <div className="bg-orange-500 text-white px-4 py-3 rounded-t-xl font-semibold flex items-center justify-between">
                  <span>Preparing</span>
                  <Badge variant="secondary" className="bg-white text-orange-500">
                    {groupedOrders.preparing.length}
                  </Badge>
                </div>
                <div className="h-[calc(100vh-280px)] bg-muted/20 rounded-b-xl p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {groupedOrders.preparing.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No orders being prepared
                      </p>
                    ) : (
                      groupedOrders.preparing.map(order => (
                        <div
                          key={order.orderId}
                          data-testid={`order-${order.orderId}`}
                          className={`bg-white rounded-lg border-l-4 ${getStatusColor(order.status)} shadow-sm p-4`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-lg">Table {order.tableNumber}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeSince(order.timestamp)}
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(order.status)}>
                              Preparing
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                            ))}
                          </div>
                          <Button
                            data-testid={`mark-ready-${order.orderId}-btn`}
                            onClick={() => updateOrderStatus(order.orderId, "ready")}
                            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg"
                            size="sm"
                          >
                            Mark as Ready
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Ready Column */}
              <div>
                <div className="bg-green-500 text-white px-4 py-3 rounded-t-xl font-semibold flex items-center justify-between">
                  <span>Ready</span>
                  <Badge variant="secondary" className="bg-white text-green-500">
                    {groupedOrders.ready.length}
                  </Badge>
                </div>
                <div className="h-[calc(100vh-280px)] bg-muted/20 rounded-b-xl p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {groupedOrders.ready.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No ready orders
                      </p>
                    ) : (
                      groupedOrders.ready.map(order => (
                        <div
                          key={order.orderId}
                          data-testid={`order-${order.orderId}`}
                          className={`bg-white rounded-lg border-l-4 ${getStatusColor(order.status)} shadow-sm p-4`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-bold text-lg">Table {order.tableNumber}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeSince(order.timestamp)}
                              </div>
                            </div>
                            <Badge className={getStatusBadgeColor(order.status)}>
                              Ready
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-sm flex justify-between">
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Waiter: {order.waiterName}
                          </div>
                          <Button
                            data-testid={`mark-served-${order.orderId}-btn`}
                            onClick={() => updateOrderStatus(order.orderId, "served")}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark as Served
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu">
            <div className="max-w-6xl mx-auto">
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <PackageOpen className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Menu Item Availability</h2>
                </div>
                {categories.map(category => (
                  <div key={category} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-foreground">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {menuItems
                        .filter(item => item.category === category)
                        .map(item => (
                          <div
                            key={item.id}
                            data-testid={`menu-item-${item.id}`}
                            className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-semibold">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${item.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                item.availability ? "text-green-600" : "text-red-600"
                              }`}>
                                {item.availability ? "Available" : "Unavailable"}
                              </span>
                              <Switch
                                data-testid={`availability-toggle-${item.id}`}
                                checked={item.availability}
                                onCheckedChange={() => toggleAvailability(item.id, item.availability)}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
