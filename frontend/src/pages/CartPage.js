import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Smartphone, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formatPrice = (price) => `₹${Math.round(price)}`;

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  useEffect(() => {
    const savedCart = localStorage.getItem("smartDineCart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

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

  const removeItem = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);
    localStorage.setItem("smartDineCart", JSON.stringify(newCart));
    toast.success("Item removed from cart");
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = () => {
    if (paymentMethod === "upi" && !upiId) {
      toast.error("Please enter UPI ID");
      return;
    }
    if (paymentMethod === "card" && !cardNumber) {
      toast.error("Please enter card number");
      return;
    }

    // Simulate payment processing
    toast.success("Processing payment...");
    setTimeout(() => {
      // Clear cart and navigate to success page
      const orderData = {
        items: cart,
        totalAmount: getTotalAmount(),
        paymentMethod,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem("lastOrder", JSON.stringify(orderData));
      localStorage.removeItem("smartDineCart");
      navigate("/payment-success");
    }, 2000);
  };

  if (cart.length === 0 && !showPayment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add items from the menu to get started</p>
          <Button
            onClick={() => navigate("/")}
            className="rounded-full bg-primary"
            data-testid="back-home-btn"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
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
            <h1 className="text-2xl md:text-3xl font-bold">Your Cart</h1>
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {!showPayment ? (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div
                  key={item.id}
                  data-testid={`cart-item-${item.id}`}
                  className="bg-card rounded-xl border border-border p-4 flex gap-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{formatPrice(item.price)} each</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`remove-item-${item.id}-btn`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-8 w-8 p-0 rounded-full"
                          data-testid={`decrease-qty-${item.id}-btn`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-semibold w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8 p-0 rounded-full"
                          data-testid={`increase-qty-${item.id}-btn`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(getTotalAmount())}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (5%)</span>
                  <span>{formatPrice(getTotalAmount() * 0.05)}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(getTotalAmount() * 1.05)}</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleProceedToPayment}
                className="w-full bg-primary rounded-full py-6 text-lg font-semibold"
                data-testid="proceed-payment-btn"
              >
                Proceed to Payment
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Payment Section */}
            <div className="bg-card rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
              
              {/* Payment Method Selection */}
              <div className="space-y-4 mb-6">
                <div
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === "upi" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid="upi-payment-option"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-6 w-6 text-primary" />
                    <div>
                      <div className="font-semibold">UPI Payment</div>
                      <div className="text-sm text-muted-foreground">Pay using UPI ID</div>
                    </div>
                  </div>
                  {paymentMethod === "upi" && (
                    <div className="mt-4">
                      <Input
                        placeholder="Enter UPI ID (e.g., user@paytm)"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        data-testid="upi-id-input"
                      />
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  data-testid="card-payment-option"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-primary" />
                    <div>
                      <div className="font-semibold">Card Payment</div>
                      <div className="text-sm text-muted-foreground">Credit / Debit Card</div>
                    </div>
                  </div>
                  {paymentMethod === "card" && (
                    <div className="mt-4 space-y-3">
                      <Input
                        placeholder="Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={16}
                        data-testid="card-number-input"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="MM/YY" maxLength={5} />
                        <Input placeholder="CVV" maxLength={3} type="password" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Total */}
              <div className="bg-muted/50 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Amount to Pay</span>
                  <span className="text-primary">{formatPrice(getTotalAmount() * 1.05)}</span>
                </div>
              </div>

              {/* Payment Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPayment(false)}
                  variant="outline"
                  className="flex-1 rounded-full py-6"
                  data-testid="back-to-cart-btn"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1 bg-primary rounded-full py-6 text-lg font-semibold"
                  data-testid="confirm-payment-btn"
                >
                  Pay Now
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
