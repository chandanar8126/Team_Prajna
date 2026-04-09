import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import type { Priority } from "@/lib/data";
import {
  Package, Route, ShieldAlert, CheckCircle,
  Truck, Plane, Ship, Train, AlertTriangle, Clock, MapPin,
  Thermometer, Wind, Droplets, CloudRain, Sun, CloudLightning, Cloud,
  TrendingUp, Award, RefreshCw,
} from "lucide-react";

// ── CITY DATA ─────────────────────────────────────────────────────────────
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Mumbai:    { lat: 19.0760, lng: 72.8777 },
  Delhi:     { lat: 28.6139, lng: 77.2090 },
  Chennai:   { lat: 13.0827, lng: 80.2707 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Kolkata:   { lat: 22.5726, lng: 88.3639 },
  Hyderabad: { lat: 17.3850, lng: 78.4867 },
  Pune:      { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur:    { lat: 26.9124, lng: 75.7873 },
  Lucknow:   { lat: 26.8467, lng: 80.9462 },
  Surat:     { lat: 21.1702, lng: 72.8311 },
  Nagpur:    { lat: 21.1458, lng: 79.0882 },
  Bhopal:    { lat: 23.2599, lng: 77.4126 },
  Indore:    { lat: 22.7196, lng: 75.8577 },
  Kochi:     { lat: 9.9312,  lng: 76.2673 },
};
const CITIES = Object.keys(CITY_COORDS).sort();

const SUPPLIERS_WITH_SCORES = [
  { id: "sup-1", name: "PharmaLink Co.",   score: 92.4, cold_chain: true  },
  { id: "sup-2", name: "MedSupply India",  score: 84.6, cold_chain: false },
  { id: "sup-3", name: "QuickMeds Ltd.",   score: 85.1, cold_chain: true  },
  { id: "sup-4", name: "GlobalPharma",     score: 72.5, cold_chain: false },
  { id: "sup-5", name: "BioRoute Express", score: 89.8, cold_chain: true  },
];

// ── TYPES ─────────────────────────────────────────────────────────────────
interface RouteOption {
  type: string; label: string; time_hours: number;
  cost_inr: number; risk: string; description: string;
  recommended: boolean; time_saved_vs_cheapest: number;
}
interface SupplierRank {
  id: string; name: string; on_time_rate: number; price_score: number;
  quality_rate: number; total_score: number; delay_history: number;
  rank: number; is_current: boolean; cold_chain: boolean;
  cold_chain_warning: boolean; years_active: number; coverage_cities: number;
}
interface WeatherDetail {
  category: string; description: string;
  temperature_c: number | null; humidity: number | null;
  wind_speed_kmh: number | null; source: string;
}
interface RiskFactors {
  supplier: number; distance: number; weather: number;
  weight: number; cold_chain: number;
}
interface AIResult {
  eta: string; eta_hours: number; distance_km: number;
  travel_hours: number; overhead_hours: number;
  prediction: "Low" | "Medium" | "High"; risk_score: number;
  risk_reason: string; risk_factors: RiskFactors;
  cold_chain_warning: boolean;
  route: string; route_description: string;
  route_recommendation_reason: string;
  all_routes: RouteOption[];
  roadblocks: boolean; supplier_rankings: SupplierRank[];
  current_supplier: SupplierRank; backup_supplier: SupplierRank | null;
  transportMode: string; weather: string; weather_detail: WeatherDetail;
  auto_actions: string[]; is_crisis: boolean;
  origin_coords: { lat: number; lng: number };
  dest_coords: { lat: number; lng: number };
}

// ── WEATHER ICON ──────────────────────────────────────────────────────────
function WeatherIcon({ category, size = 16 }: { category: string; size?: number }) {
  const props = { size, strokeWidth: 1.8 };
  switch (category) {
    case "Stormy": return <CloudLightning {...props} className="text-yellow-600" />;
    case "Rainy":  return <CloudRain      {...props} className="text-blue-500"   />;
    case "Fog":    return <Cloud          {...props} className="text-slate-400"  />;
    default:       return <Sun            {...props} className="text-amber-500"  />;
  }
}

// ── TRANSPORT ICON ────────────────────────────────────────────────────────
function TransportIcon({ mode, size = 20 }: { mode: string; size?: number }) {
  const props = { size, strokeWidth: 1.8 };
  if (mode === "Air")   return <Plane  {...props} className="text-blue-500"   />;
  if (mode === "Ship")  return <Ship   {...props} className="text-teal-500"   />;
  if (mode === "Train") return <Train  {...props} className="text-purple-500" />;
  return                        <Truck  {...props} className="text-slate-600"  />;
}

// ── RISK FACTOR BAR ───────────────────────────────────────────────────────
function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── STAT CARD ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${highlight ? "border-blue-300 bg-blue-50/30" : "bg-card border-border"}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-base mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── ANIMATED MAP ──────────────────────────────────────────────────────────
function ShipmentMap({ result, origin, destination }: {
  result: AIResult; origin: string; destination: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef(0);

  const LAT_MIN = 7, LAT_MAX = 38, LNG_MIN = 67, LNG_MAX = 99;
  const project = (lat: number, lng: number, W: number, H: number) => ({
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (W - 100) + 50,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - 80) + 40,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = "rgba(148,163,184,0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath(); ctx.moveTo(i * W / 10, 0); ctx.lineTo(i * W / 10, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * H / 10); ctx.lineTo(W, i * H / 10); ctx.stroke();
      }

      // All city markers
      Object.entries(CITY_COORDS).forEach(([city, c]) => {
        const p = project(c.lat, c.lng, W, H);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,102,241,0.18)";
        ctx.fill();
        ctx.strokeStyle = "rgba(99,102,241,0.35)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "rgba(100,116,139,0.50)";
        ctx.font = "9px system-ui";
        ctx.fillText(city, p.x + 6, p.y - 2);
      });

      const oc = project(result.origin_coords.lat, result.origin_coords.lng, W, H);
      const dc = project(result.dest_coords.lat,   result.dest_coords.lng,   W, H);
      const mx = (oc.x + dc.x) / 2;
      const my = (oc.y + dc.y) / 2 - 42;

      // Dashed route path
      ctx.beginPath();
      ctx.moveTo(oc.x, oc.y);
      ctx.quadraticCurveTo(mx, my, dc.x, dc.y);
      ctx.strokeStyle = "rgba(59,130,246,0.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Animated vehicle dot
      const t = tRef.current;
      const dotX = (1 - t) * (1 - t) * oc.x + 2 * (1 - t) * t * mx + t * t * dc.x;
      const dotY = (1 - t) * (1 - t) * oc.y + 2 * (1 - t) * t * my + t * t * dc.y;

      // Glow
      ctx.beginPath();
      ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59,130,246,0.12)";
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#3b82f6";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      // Origin pin
      ctx.beginPath();
      ctx.arc(oc.x, oc.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("O", oc.x, oc.y + 3);

      // Destination pin
      ctx.beginPath();
      ctx.arc(dc.x, dc.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = result.is_crisis ? "#dc2626" : "#16a34a";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText("D", dc.x, dc.y + 3);
      ctx.textAlign = "left";

      // Labels
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText(origin, oc.x + 14, oc.y + 4);
      ctx.fillStyle = result.is_crisis ? "#dc2626" : "#15803d";
      ctx.fillText(destination, dc.x + 14, dc.y + 4);

      // Distance label
      ctx.font = "10px system-ui";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(`${result.distance_km} km`, mx, my - 9);
      ctx.textAlign = "left";

      tRef.current = (tRef.current + 0.0025) % 1;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [result, origin, destination]);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-card">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Live Route Tracking</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {origin} &rarr; {destination} &middot; {result.distance_km} km &middot; {result.transportMode}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        style={{ width: "100%", display: "block" }}
      />
    </div>
  );
}

// ── WEATHER CARD ──────────────────────────────────────────────────────────
function WeatherCard({ detail, city }: { detail: WeatherDetail; city: string }) {
  const isLive = detail.source === "live_api";
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <WeatherIcon category={detail.category} size={18} />
          <span className="text-sm font-semibold">{city} Weather</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isLive
            ? "bg-green-100 text-green-700"
            : "bg-amber-50 text-amber-600 border border-amber-200"
        }`}>
          {isLive ? "Live" : "Estimated"}
        </span>
      </div>
      <p className="text-base font-bold mb-2">{detail.category}
        {detail.description && detail.description !== `Regional estimate for ${city}`
          ? <span className="text-xs font-normal text-muted-foreground ml-2">— {detail.description}</span>
          : null}
      </p>
      {isLive && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {detail.temperature_c !== null && (
            <div className="flex items-center gap-1.5">
              <Thermometer size={13} className="text-red-400" />
              <span className="text-xs text-muted-foreground">{detail.temperature_c}°C</span>
            </div>
          )}
          {detail.humidity !== null && (
            <div className="flex items-center gap-1.5">
              <Droplets size={13} className="text-blue-400" />
              <span className="text-xs text-muted-foreground">{detail.humidity}% RH</span>
            </div>
          )}
          {detail.wind_speed_kmh !== null && (
            <div className="flex items-center gap-1.5">
              <Wind size={13} className="text-slate-400" />
              <span className="text-xs text-muted-foreground">{detail.wind_speed_kmh} km/h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function CreateShipment() {
  const { addShipment, addAlert } = useAppStore();

  const [form, setForm] = useState({
    medicine: "", weight: "", origin: "", destination: "",
    priority: "Normal" as Priority, supplierId: "",
  });
  const [result,    setResult]    = useState<AIResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "routes" | "suppliers" | "map">("overview");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.origin || !form.destination || !form.supplierId) {
      setErrorMsg("Please fill out all fields before submitting.");
      return;
    }
    if (form.origin === form.destination) {
      setErrorMsg("Origin and destination cannot be the same city.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/api/analyze-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Backend error");
      const aiData: AIResult = await res.json();

      const id = `SHP${String(Date.now()).slice(-6)}`;
      const supplierName = SUPPLIERS_WITH_SCORES.find(s => s.id === form.supplierId)?.name || "Unknown";

      const shipment = {
        id, medicine: form.medicine, weight: Number(form.weight),
        origin: form.origin, destination: form.destination,
        priority: form.priority, supplierId: form.supplierId,
        supplierName, eta: aiData.eta, etaHours: aiData.eta_hours,
        riskLevel: aiData.prediction, recommendedRoute: aiData.route,
        transportMode: aiData.transportMode, weather: aiData.weather,
        hasRoadblocks: aiData.roadblocks, status: "In Transit",
        createdAt: new Date().toISOString(), progress: 0,
      } as any;

      addShipment(shipment);
      setResult(aiData);
      setActiveTab("overview");

      await fetch("http://127.0.0.1:5000/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipment),
      });

      if (form.priority === "Emergency") {
        addAlert({
          id: `a-${Date.now()}`, shipmentId: id,
          message: `Emergency: ${form.medicine} dispatched via ${aiData.transportMode}`,
          type: "emergency", timestamp: new Date().toISOString(), read: false,
        });
      }
    } catch {
      setErrorMsg(
        "Failed to connect to Python AI backend. Please ensure 'python app.py' is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSupplier = SUPPLIERS_WITH_SCORES.find(s => s.id === form.supplierId);

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">New Shipment Analysis</h2>
          <p className="text-muted-foreground text-sm mt-1">
            All 4 AI agents run simultaneously — ETA, risk, route, and supplier scoring.
            Weather is fetched live from the origin city.
          </p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="text-sm font-medium mb-1.5 block">Medicine / Cargo</label>
              <input
                required
                value={form.medicine}
                onChange={e => setForm(p => ({ ...p, medicine: e.target.value }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g. Insulin, Vaccines"
              />
              {form.medicine && (
                <p className="text-xs text-muted-foreground mt-1">
                  {["vaccine","insulin","biologics","plasma","blood","antibody","serum","enzyme","hormone","immunoglobulin"]
                    .some(k => form.medicine.toLowerCase().includes(k))
                    ? "Cold-chain medicine detected — AI will factor this in."
                    : "Standard medicine — no cold-chain required."}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Weight (kg)</label>
              <input
                required
                type="number"
                min="1"
                value={form.weight}
                onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g. 500"
              />
              {form.weight && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(form.weight) > 5000
                    ? "Heavy cargo — AI may select Ship or Train."
                    : Number(form.weight) > 1000
                    ? "Medium cargo — AI may select Train."
                    : "Light cargo — Truck or Air likely."}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency — Forces Air Transport</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Origin City</label>
              <select
                required
                value={form.origin}
                onChange={e => setForm(p => ({ ...p, origin: e.target.value }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select origin...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.origin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Live weather will be fetched for {form.origin}.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Destination City</label>
              <select
                required
                value={form.destination}
                onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select destination...</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Supplier</label>
              <select
                required
                value={form.supplierId}
                onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
                className="w-full px-3.5 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select supplier...</option>
                {SUPPLIERS_WITH_SCORES.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — Score: {s.score}%{s.cold_chain ? " — Cold Chain" : ""}
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSupplier.cold_chain
                    ? "Cold-chain capable supplier."
                    : "Standard supplier — no refrigeration."}
                </p>
              )}
            </div>

          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors text-sm"
            >
              {isLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running AI Agents...</>
                : <><Package className="w-4 h-4" /> Run AI Analysis</>
              }
            </button>
            {isLoading && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Fetching live weather + running 4 agents...
              </p>
            )}
          </div>
        </form>

        {/* ── RESULTS ── */}
        {result && (
          <div className="space-y-4">

            {/* Crisis banner */}
            {result.is_crisis && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 text-sm mb-2">
                      HIGH RISK DETECTED — Auto Crisis Response Activated
                    </p>
                    <ul className="space-y-1">
                      {result.auto_actions.map((a, i) => (
                        <li key={i} className="text-red-600 text-sm flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-red-200 text-red-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            {i + 1}
                          </span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Summary card */}
            <div className={`rounded-lg border-2 p-5 ${
              result.is_crisis ? "border-red-400 bg-red-50/20" : "border-blue-400 bg-blue-50/10"
            }`}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Analysis Complete
                </h3>
                <span className="text-sm text-muted-foreground">
                  {form.origin} &rarr; {form.destination} &middot; {result.distance_km} km
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={<TransportIcon mode={result.transportMode} />}
                  label="Transport Mode"
                  value={result.transportMode}
                  sub="AI selected"
                />
                <StatCard
                  icon={<WeatherIcon category={result.weather} size={18} />}
                  label="Live Weather"
                  value={result.weather}
                  sub={result.weather_detail.source === "live_api" ? "From OpenWeather" : "Regional estimate"}
                />
                <StatCard
                  icon={<Clock size={20} strokeWidth={1.8} className="text-emerald-500" />}
                  label="Estimated ETA"
                  value={result.eta}
                  sub={`${result.distance_km} km · ${result.travel_hours}h travel`}
                  highlight
                />
                <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                  <ShieldAlert size={20} strokeWidth={1.8} className="text-red-500 mb-2" />
                  <p className="text-xs text-muted-foreground">Risk Level</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    <RiskBadge level={result.prediction} />
                    <span className="text-xs text-muted-foreground">Score: {Math.round(result.risk_score * 100)}%</span>
                  </div>
                </div>
              </div>

              {form.priority === "Emergency" && (
                <div className="mt-3 bg-red-600 text-white p-3 rounded-lg text-sm font-semibold">
                  Emergency mode: fastest route enforced. Critical delivery flagged across all agents.
                </div>
              )}

              {result.cold_chain_warning && (
                <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm">
                  Cold-chain alert: This medicine requires refrigerated transport but the selected supplier is not cold-chain capable.
                  Consider switching to {result.backup_supplier?.name || "a cold-chain supplier"}.
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-border">
              <div className="flex gap-0">
                {(["overview", "routes", "suppliers", "map"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "overview"   ? "Overview"
                   : tab === "routes"    ? "Routes"
                   : tab === "suppliers" ? "Suppliers"
                   :                       "Live Map"}
                  </button>
                ))}
              </div>
            </div>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-3">

                {/* Live weather detail */}
                <WeatherCard detail={result.weather_detail} city={form.origin} />

                {/* Risk breakdown */}
                <div className="bg-card rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
                    Agent 2 — Risk Breakdown
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <RiskBadge level={result.prediction} />
                    <span className="text-sm text-foreground">{result.risk_reason}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <FactorBar label="Supplier reliability" value={result.risk_factors.supplier} color="bg-blue-500" />
                    <FactorBar label="Distance factor"      value={result.risk_factors.distance} color="bg-purple-500" />
                    <FactorBar label="Weather impact"       value={result.risk_factors.weather}  color="bg-amber-500" />
                    <FactorBar label="Weight strain"        value={result.risk_factors.weight}   color="bg-slate-400" />
                    {result.risk_factors.cold_chain > 0 && (
                      <FactorBar label="Cold-chain mismatch" value={result.risk_factors.cold_chain} color="bg-red-500" />
                    )}
                  </div>
                </div>

                {/* Recommended route */}
                <div className="bg-card rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                    Agent 3 — Route Recommendation
                  </p>
                  <div className="flex items-start gap-3">
                    <Route className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                    <div>
                      <p className="font-semibold text-sm">{result.route}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.route_description}</p>
                      <p className="text-xs text-blue-600 mt-1">{result.route_recommendation_reason}</p>
                    </div>
                  </div>
                </div>

                {/* Backup supplier */}
                {result.backup_supplier && (
                  <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                    <p className="text-xs text-emerald-700 uppercase tracking-wider font-bold mb-3">
                      Agent 4 — Backup Supplier Recommended
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">{result.backup_supplier.name}</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          On-time: {result.backup_supplier.on_time_rate}% &middot;
                          Quality: {result.backup_supplier.quality_rate}% &middot;
                          {result.backup_supplier.cold_chain ? " Cold-chain capable" : " No cold-chain"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-700">{result.backup_supplier.total_score}%</p>
                        <p className="text-xs text-emerald-600">composite score</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROUTES */}
            {activeTab === "routes" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Agent 3 — Route Analysis &middot; Mode: {result.transportMode}
                  {result.roadblocks ? " &middot; Severe weather detected — cheapest route riskier" : ""}
                </p>
                {result.all_routes.map((route, i) => (
                  <div
                    key={i}
                    className={`bg-card rounded-lg border p-4 ${
                      route.recommended ? "border-blue-400 bg-blue-50/30" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {route.recommended && (
                          <span className="inline-block text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mb-1.5">
                            Recommended
                          </span>
                        )}
                        <p className={`font-bold text-sm ${route.recommended ? "text-blue-700" : ""}`}>
                          {route.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{route.description}</p>
                        {route.time_saved_vs_cheapest > 0 && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            Saves {route.time_saved_vs_cheapest}h vs cheapest route
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Time</p>
                          <p className="font-bold text-sm">{route.time_hours}h</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Cost</p>
                          <p className="font-bold text-sm">₹{route.cost_inr.toLocaleString()}</p>
                        </div>
                        <RiskBadge level={route.risk as any} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SUPPLIERS */}
            {activeTab === "suppliers" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
    
                  {result.cold_chain_warning ? " — cold-chain penalty applied" : ""}
                </p>
                {result.supplier_rankings.map(sup => (
                  <div
                    key={sup.id}
                    className={`bg-card rounded-lg border p-4 ${
                      sup.is_current ? "border-blue-400 bg-blue-50/30" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        sup.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                      }`}>
                        #{sup.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{sup.name}</span>
                          {sup.is_current && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                              Selected
                            </span>
                          )}
                          {sup.cold_chain && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
                              Cold Chain
                            </span>
                          )}
                          {sup.cold_chain_warning && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                              Cold-chain mismatch
                            </span>
                          )}
                          {sup.delay_history >= 5 && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                              {sup.delay_history} delays
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sup.years_active} yrs active &middot; covers {sup.coverage_cities} cities
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xl font-black ${
                          sup.rank === 1 ? "text-amber-600" : "text-foreground"
                        }`}>
                          {sup.total_score}%
                        </span>
                        {sup.rank === 1 && <Award size={14} className="text-amber-500 ml-auto mt-0.5" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <FactorBar label="On-time"  value={sup.on_time_rate / 100} color="bg-green-500"  />
                      <FactorBar label="Price"    value={sup.price_score  / 100} color="bg-blue-500"   />
                      <FactorBar label="Quality"  value={sup.quality_rate / 100} color="bg-purple-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MAP */}
            {activeTab === "map" && (
              <div className="space-y-3">
                <ShipmentMap result={result} origin={form.origin} destination={form.destination} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin size={12} /> Origin
                    </p>
                    <p className="font-bold text-sm text-blue-600">{form.origin}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.origin_coords.lat.toFixed(2)}N, {result.origin_coords.lng.toFixed(2)}E
                    </p>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Distance</p>
                    <p className="text-2xl font-black">{result.distance_km}</p>
                    <p className="text-xs text-muted-foreground">km &middot; {result.transportMode}</p>
                  </div>
                  <div className="bg-card rounded-lg border border-border p-3 text-right">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1 justify-end">
                      <MapPin size={12} /> Destination
                    </p>
                    <p className={`font-bold text-sm ${result.is_crisis ? "text-red-500" : "text-green-600"}`}>
                      {form.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.dest_coords.lat.toFixed(2)}N, {result.dest_coords.lng.toFixed(2)}E
                    </p>
                  </div>
                </div>
                <div className="bg-card rounded-lg border border-border p-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Travel time</p>
                    <p className="font-semibold text-sm">{result.travel_hours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Overhead (loading etc.)</p>
                    <p className="font-semibold text-sm">{result.overhead_hours}h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total ETA</p>
                    <p className="font-bold text-sm text-blue-600">{result.eta}</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}