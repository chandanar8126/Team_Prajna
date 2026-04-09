import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import { suppliers, cityNames, calculateETA, detectRisk, getRecommendedRoute } from "@/lib/data";
import type { Priority, Shipment, Alert } from "@/lib/data";
import { Package, Clock, Route, ShieldAlert, CheckCircle } from "lucide-react";

export default function CreateShipment() {
  const { addShipment, addAlert } = useAppStore();
  const [form, setForm] = useState({
    medicine: "",
    weight: "",
    origin: "",
    destination: "",
    priority: "Normal" as Priority,
    supplierId: "",
  });
  const [result, setResult] = useState<Shipment | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find((s) => s.id === form.supplierId);
    if (!supplier || !form.origin || !form.destination) return;

    const etaHours = calculateETA(form.origin, form.destination, form.priority);
    const riskLevel = detectRisk(form.priority, form.origin, form.destination);
    const recommendedRoute = getRecommendedRoute(form.origin, form.destination, form.priority);
    const id = `SHP${String(Date.now()).slice(-6)}`;

    const shipment: Shipment = {
      id,
      medicine: form.medicine,
      weight: Number(form.weight),
      origin: form.origin,
      destination: form.destination,
      priority: form.priority,
      supplierId: supplier.id,
      supplierName: supplier.name,
      eta: `${etaHours}h`,
      etaHours,
      riskLevel,
      recommendedRoute,
      status: "In Transit",
      createdAt: new Date().toISOString(),
      progress: 0,
    };

    addShipment(shipment);
    setResult(shipment);

    if (form.priority === "Emergency") {
      addAlert({
        id: `a-${Date.now()}`,
        shipmentId: id,
        message: `🚨 Emergency shipment: ${form.medicine} – Critical delivery required`,
        type: "emergency",
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create New Shipment</h2>
          <p className="text-muted-foreground text-sm mt-1">AI will predict ETA, risk, and route</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Medicine Name</label>
              <input
                required value={form.medicine}
                onChange={(e) => setForm({ ...form, medicine: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Amoxicillin 500mg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Weight (kg)</label>
              <input
                required type="number" value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Origin</label>
              <select
                required value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select origin</option>
                {cityNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Destination</label>
              <select
                required value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select destination</option>
                {cityNames.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Emergency">🚨 Emergency</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Supplier</label>
              <select
                required value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} (Score: {s.totalScore})</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            <Package className="w-4 h-4 inline mr-2" />
            Create Shipment & Predict
          </button>
        </form>

        {/* AI Prediction Result */}
        {result && (
          <div className={`rounded-lg border-2 p-6 shadow-elevated animate-fade-in-up ${
            result.priority === "Emergency" ? "border-emergency bg-risk-high/5" : "border-primary bg-primary/5"
          }`}>
            <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              AI Prediction Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-card p-4 rounded-lg">
                <Clock className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated ETA</p>
                  <p className="text-xl font-bold text-foreground">{result.eta}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card p-4 rounded-lg">
                <ShieldAlert className="w-8 h-8 text-risk-high" />
                <div>
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <RiskBadge level={result.riskLevel} />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card p-4 rounded-lg">
                <Route className="w-8 h-8 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">Recommended Route</p>
                  <p className="text-sm font-medium text-foreground">{result.recommendedRoute}</p>
                </div>
              </div>
            </div>
            {result.priority === "Emergency" && (
              <div className="mt-4 gradient-emergency text-primary-foreground p-3 rounded-lg text-sm font-semibold">
                🚨 EMERGENCY MODE: Auto-selected fastest route. Critical delivery flagged.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
