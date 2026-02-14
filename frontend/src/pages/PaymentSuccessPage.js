import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatPrice = (price) => `₹${Math.round(price)}`;

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    const lastOrder = localStorage.getItem("lastOrder");
    if (lastOrder) {
      setOrderData(JSON.parse(lastOrder));
    } else {
      // If no order data, redirect to home
      setTimeout(() => navigate("/"), 2000);
    }
  }, [navigate]);

  if (!orderData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-block p-4 bg-green-500/10 rounded-full mb-4">
            <CheckCircle className="h-24 w-24 text-green-500" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground text-lg">Thank you for your order</p>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          
          <div className="space-y-3 mb-4">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(orderData.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>GST (5%)</span>
              <span>{formatPrice(orderData.totalAmount * 0.05)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2">
              <span>Total Paid</span>
              <span className="text-primary">{formatPrice(orderData.totalAmount * 1.05)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-semibold capitalize">{orderData.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Time</span>
              <span className="font-semibold">
                {new Date(orderData.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 bg-primary rounded-full py-6 text-lg font-semibold"
            data-testid="goto-home-btn"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Home
          </Button>
          <Button
            onClick={() => navigate("/veg")}
            variant="outline"
            className="flex-1 rounded-full py-6 text-lg"
            data-testid="order-again-btn"
          >
            Order Again
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Your order has been received and will be prepared shortly.
        </p>
      </div>
    </div>
  );
}
