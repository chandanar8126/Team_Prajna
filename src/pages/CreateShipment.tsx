import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import type { Priority } from "@/lib/data";
import { Package, Route, ShieldAlert, CheckCircle, CloudRain, Truck, Plane, Ship, Train } from "lucide-react";
import { Link } from "react-router-dom";

// GLOBAL CITIES
export const GLOBAL_CITIES = ["New York", "London", "Tokyo", "Sydney", "Dubai", "Paris", "Singapore", "Sao Paulo", "Cape Town"];
const MOCK_SUPPLIERS = [{ id: "sup-1", name: "Global Pharma Corp" }, { id: "sup-2", name: "MedTech Logistics" }];

export default function CreateShipment() {
  const { addShipment, addAlert } = useAppStore();
  const [form, setForm] = useState({ medicine: "", weight: "", origin: "", destination: "", priority: "Normal" as Priority, supplierId: "" });
  
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validation checks
    if (!form.origin || !form.destination || !form.supplierId) {
        setErrorMsg("Please fill out all fields before submitting.");
        return;
    }
    if (form.origin === form.destination) {
        setErrorMsg("Origin and Destination cannot be the same city.");
        return;
    }

    setIsLoading(true);

    try {
      // Connect to the Python Flask Server
      const response = await fetch("http://127.0.0.1:5000/api/analyze-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!response.ok) throw new Error("Backend connection failed");
      const aiData = await response.json();

      const id = `SHP${String(Date.now()).slice(-6)}`;
      const supplierName = MOCK_SUPPLIERS.find(s => s.id === form.supplierId)?.name || "Unknown Supplier";

      // Combine form data + Python AI data
      const shipment = {
        id,
        medicine: form.medicine,
        weight: Number(form.weight),
        origin: form.origin,
        destination: form.destination,
        priority: form.priority,
        supplierId: form.supplierId,
        supplierName: supplierName,
        eta: aiData.eta,
        etaHours: parseInt(aiData.eta) || 24,
        riskLevel: aiData.prediction,
        recommendedRoute: aiData.route,
        transportMode: aiData.transportMode,
        weather: aiData.weather,
        hasRoadblocks: aiData.roadblocks,
        status: "In Transit",
        createdAt: new Date().toISOString(),
        progress: 0,
      } as any;

      // Save to global state (This triggers the map!)
      addShipment(shipment);
      setResult(shipment);

      // Create an alert if it's an emergency
      if (form.priority === "Emergency") {
        addAlert({
          id: `a-${Date.now()}`,
          shipmentId: id,
          message: `🚨 Emergency: ${form.medicine} dispatched via ${aiData.transportMode}`,
          type: "emergency",
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to Python AI. Please ensure 'python app.py' is running in your terminal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which icon to show in the results box
  const TransportIcon = result?.transportMode?.includes("✈️") ? Plane : result?.transportMode?.includes("🚢") ? Ship : result?.transportMode?.includes("🚆") ? Train : Truck;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Global Logistics AI</h2>
          <p className="text-muted-foreground text-sm mt-1">AI automatically selects Truck, Train, Ship, or Plane based on weather and weight.</p>
        </div>

        {errorMsg && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md font-medium">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 shadow-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cargo / Medicine</label>
              <input required value={form.medicine} onChange={(e) => setForm({ ...form, medicine: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-background" placeholder="e.g. Vaccines" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Total Weight (kg)</label>
              <input required type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-background" placeholder="e.g. 6000 for Ship" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="w-full px-4 py-2 border rounded-lg bg-background">
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Emergency">🚨 Emergency (Forces Air)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Global Origin</label>
              <select required value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-background">
                <option value="">Select Origin...</option>
                {GLOBAL_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Global Destination</label>
              <select required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-background">
                <option value="">Select Destination...</option>
                {GLOBAL_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Supplier</label>
              <select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-4 py-2 border rounded-lg bg-background">
                <option value="">Select Supplier...</option>
                {MOCK_SUPPLIERS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Package className="w-4 h-4" />
            {isLoading ? "Running Global AI Models..." : "Deploy AI Analysis"}
          </button>
        </form>

        {result && (
          <div className={`rounded-lg border-2 p-6 shadow-md animate-fade-in-up ${result.priority === "Emergency" ? "border-red-500 bg-red-50/10" : "border-blue-500 bg-blue-50/10"}`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> AI Assignment Complete</h3>
              <Link to="/live-map" className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-700 text-center">Track on Global Map</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <TransportIcon className="w-6 h-6 text-blue-500 mb-2" />
                <p className="text-xs text-muted-foreground">Chosen Mode</p>
                <p className="font-bold">{result.transportMode}</p>
              </div>
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <CloudRain className="w-6 h-6 text-indigo-400 mb-2" />
                <p className="text-xs text-muted-foreground">Weather Condition</p>
                <p className="font-bold">{result.weather}</p>
              </div>
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <Route className="w-6 h-6 text-emerald-500 mb-2" />
                <p className="text-xs text-muted-foreground">AI Route</p>
                <p className="font-bold text-sm truncate" title={result.recommendedRoute}>{result.recommendedRoute}</p>
                {result.hasRoadblocks && <p className="text-xs text-orange-500 font-bold mt-1">⚠️ Avoiding Storms</p>}
              </div>
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <ShieldAlert className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-xs text-muted-foreground">Risk & ETA</p>
                <div className="mt-1 flex gap-2 items-center">
                  <RiskBadge level={result.riskLevel} />
                  <span className="text-sm font-bold">{result.eta}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
