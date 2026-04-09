// HospitalOrders.tsx
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import {
  suppliers,
  cityNames,
  generateFactoryRecommendations,
  type Priority,
  type HospitalOrder,
  type FactoryRecommendation,
} from "@/lib/data";
import { ShoppingCart, Star, Clock, DollarSign, Shield, Zap } from "lucide-react";

const medicines = [
  "Morphine 10mg",
  "Saline IV Bags (1000ml)",
  "Antibiotics (Ciprofloxacin)",
  "Surgical Gloves (50k)",
  "Insulin Vials",
  "Blood Bags (Type O)",
  "Paracetamol 250mg",
  "Ventilator Parts",
  "Oxygen Cylinders",
];

export default function HospitalOrders() {
  const { orders, addOrder, acceptOrder } = useAppStore();
  const [medicine, setMedicine] = useState(medicines[0]);
  const [quantity, setQuantity] = useState(100);
  const [priority, setPriority] = useState<Priority>("Normal");
  const [destination, setDestination] = useState(cityNames[0]);
  const [showRecommendations, setShowRecommendations] = useState<string | null>(null);
  const [lastRecommendations, setLastRecommendations] = useState<FactoryRecommendation[]>([]);

  const handlePlaceOrder = () => {
    const recs = generateFactoryRecommendations(destination, priority, suppliers);
    const newOrder: HospitalOrder = {
      id: `ORD${String(Date.now()).slice(-4)}`,
      medicine,
      quantity,
      hospitalName: "My Hospital",
      priority,
      destination,
      origin: destination,
      status: "Pending",
      assignedFactoryId: null,
      assignedFactoryName: null,
      recommendedFactories: recs,
      createdAt: new Date().toISOString(),
      eta: null,
      riskLevel: null,
    };
    addOrder(newOrder);
    setLastRecommendations(recs);
    setShowRecommendations(newOrder.id); // open recommendations automatically
  };

  const handleAcceptFactory = (orderId: string, factoryId: string) => {
    acceptOrder(orderId, factoryId); // assign factory in the store
    setShowRecommendations(null);    // close recommendations
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Order Form */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-card max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground mb-2">Place Order</h2>
          <p className="text-sm text-muted-foreground mb-4">Order medicines and get AI factory recommendations</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Medicine</label>
              <select value={medicine} onChange={(e) => setMedicine(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {medicines.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(+e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency 🚨</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Delivery Destination</label>
              <select value={destination} onChange={(e) => setDestination(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {cityNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {priority === "Emergency" && (
            <div className="mt-4 gradient-emergency text-primary-foreground p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse-glow">
              <Zap className="w-4 h-4" /> Emergency mode: AI will auto-select fastest factory
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            className="mt-6 gradient-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Place Order & Get AI Recommendations
          </button>
        </div>

        {/* Orders Table */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">My Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th>ID</th>
                  <th>Medicine</th>
                  <th>Qty</th>
                  <th>Priority</th>
                  <th>Assigned Factory</th>
                  <th>ETA</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td>{o.id}</td>
                    <td>{o.medicine}</td>
                    <td>{o.quantity}</td>
                    <td>{o.priority}</td>
                    <td>{o.assignedFactoryName || "—"}</td>
                    <td>{o.eta || "—"}</td>
                    <td>{o.riskLevel ? <RiskBadge level={o.riskLevel} /> : "—"}</td>
                    <td>{o.status}</td>
                    <td>
                      {o.status === "Pending" && (
                        <button
                          onClick={() => setShowRecommendations(showRecommendations === o.id ? null : o.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          View Factories
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations Panel */}
        {showRecommendations && (() => {
          const order = orders.find((o) => o.id === showRecommendations);
          if (!order) return null;
          return (
            <div className="bg-card rounded-lg border border-primary/30 p-5 shadow-elevated">
              <h4 className="font-semibold text-foreground mb-3">
                AI Factory Recommendations for {order.medicine}
              </h4>
              <div className="space-y-2">
                {order.recommendedFactories.map((rec, i) => (
                  <div key={rec.supplierId} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                      <span className="font-medium text-foreground">{rec.supplierName}</span>
                      <span className="text-xs text-muted-foreground">{rec.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{rec.eta}h</span>
                      <span className="text-muted-foreground">${rec.cost}/kg</span>
                      <RiskBadge level={rec.riskLevel} />
                      <button
                        onClick={() => handleAcceptFactory(order.id, rec.supplierId)}
                        className="gradient-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-medium hover:opacity-90"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
