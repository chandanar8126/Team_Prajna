import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle, Activity, Navigation, Truck, Shield,
  Clock, MessageSquare, CheckCircle, RefreshCw, Zap,
} from "lucide-react";

// ── TYPES ─────────────────────────────────────────────────────────────────
interface TrafficData {
  level: "Clear" | "Moderate" | "Heavy" | "Severe";
  current_speed: number;
  free_flow_speed: number;
  speed_ratio: number;
  delay_minutes: number;
  source: string;
  needs_clearance: boolean;
}

interface PoliceAlert {
  truck_number: string;
  sms_sent: boolean;
  sms_simulated: boolean;
  sms_message: string;
  timestamp: string;
  status: "clearance_requested" | "rerouted";
}

interface TruckState {
  id: string;
  medicine: string;
  priority: string;
  progress: number;
  hasTraffic: boolean;
  routePath: "standard" | "fast";
  routeData: typeof ROUTES[number];
  speedConfig: number;
  trafficTrigger: number;
  traffic: TrafficData | null;
  policeAlert: PoliceAlert | null;
  alertSent: boolean;
  rerouted: boolean;
}

// ── FIXED ROUTES ───────────────────────────────────────────────────────────
const ROUTES = [
  {
    originName: "Mumbai",    destName: "Pune",
    std:  [[19.076,72.877],[18.75,73.40],[18.520,73.856]]  as [number,number][],
    fast: [[19.076,72.877],[18.90,73.20],[18.65,73.65],[18.520,73.856]] as [number,number][],
  },
  {
    originName: "Delhi",     destName: "Agra",
    std:  [[28.613,77.209],[27.80,77.60],[27.176,78.008]]  as [number,number][],
    fast: [[28.613,77.209],[28.10,77.80],[27.50,77.90],[27.176,78.008]] as [number,number][],
  },
  {
    originName: "Bangalore", destName: "Mysore",
    std:  [[12.971,77.594],[12.50,77.00],[12.295,76.639]]  as [number,number][],
    fast: [[12.971,77.594],[12.70,77.30],[12.40,76.80],[12.295,76.639]] as [number,number][],
  },
  {
    originName: "Chennai",   destName: "Vellore",
    std:  [[13.082,80.270],[12.90,79.80],[12.916,79.132]]  as [number,number][],
    fast: [[13.082,80.270],[13.20,79.80],[13.10,79.40],[12.916,79.132]] as [number,number][],
  },
];

// ── MAP ICONS ─────────────────────────────────────────────────────────────
const originIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div style="width:32px;height:32px;background:#1e293b;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:13px">F</div>`,
  iconSize: [32,32], iconAnchor: [16,16],
});
const destIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div style="width:32px;height:32px;background:#059669;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:13px;color:white;font-weight:bold">H</div>`,
  iconSize: [32,32], iconAnchor: [16,16],
});

const makeTruckIcon = (hasTraffic: boolean, rerouted: boolean, label: string) => L.divIcon({
  className: "bg-transparent",
  html: `
    <div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;color:#1e293b;margin-bottom:3px">
        ${label}
      </div>
      <div style="width:28px;height:28px;background:${rerouted ? '#10b981' : hasTraffic ? '#f97316' : '#2563eb'};border:2px solid white;border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
    </div>`,
  iconSize: [70,52], iconAnchor: [35,52],
});

// ── HELPERS ───────────────────────────────────────────────────────────────
function interpolate(points: [number,number][], pct: number): [number,number] {
  const total = points.length - 1;
  const scaled = (pct / 100) * total;
  const seg = Math.min(Math.floor(scaled), total - 1);
  const t = scaled - seg;
  return [
    points[seg][0] + (points[seg+1][0] - points[seg][0]) * t,
    points[seg][1] + (points[seg+1][1] - points[seg][1]) * t,
  ];
}

function trafficColor(level: string) {
  if (level === "Severe")   return "#dc2626";
  if (level === "Heavy")    return "#f97316";
  if (level === "Moderate") return "#eab308";
  return "#22c55e";
}

function trafficBg(level: string) {
  if (level === "Severe")   return "bg-red-50 border-red-300 text-red-700";
  if (level === "Heavy")    return "bg-orange-50 border-orange-300 text-orange-700";
  if (level === "Moderate") return "bg-yellow-50 border-yellow-300 text-yellow-700";
  return "bg-green-50 border-green-300 text-green-700";
}

// ── TRAFFIC STATUS BADGE ──────────────────────────────────────────────────
function TrafficBadge({ level }: { level: string }) {
  const cls = trafficBg(level);
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {level}
    </span>
  );
}

// ── POLICE SMS MODAL ──────────────────────────────────────────────────────
function PoliceSmsModal({ alert, onClose }: { alert: PoliceAlert; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border-2 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            alert.sms_sent ? "bg-green-100" : "bg-blue-100"
          }`}>
            <MessageSquare size={20} className={alert.sms_sent ? "text-green-600" : "text-blue-600"} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Police Alert Dispatched</h3>
            <p className="text-xs text-slate-500">
              Truck {alert.truck_number} &middot; {alert.sms_sent ? "SMS Delivered" : "SMS Simulated"}
            </p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-semibold ${
            alert.sms_sent ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
          }`}>
            {alert.sms_sent ? "Sent" : "Demo Mode"}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">SMS Message Sent</p>
          <p className="text-sm text-slate-700 leading-relaxed">{alert.sms_message}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-semibold mb-1">Truck Number</p>
            <p className="text-sm font-bold text-blue-800">{alert.truck_number}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 font-semibold mb-1">Timestamp</p>
            <p className="text-sm font-bold text-slate-700">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {!alert.sms_sent && (
          <p className="text-xs text-slate-500 mb-4 italic">
            Demo mode: above SMS would be sent to traffic police via Fast2SMS when API keys are configured.
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── MAIN MAP COMPONENT ────────────────────────────────────────────────────
function MultiTrackerMap({ shipments }: { shipments: any[] }) {
  const [trucks, setTrucks] = useState<TruckState[]>(() =>
    ROUTES.map((route, i) => {
      const s = shipments[i] || { medicine: `Medical Supply ${i+1}`, priority: "Normal" };
      return {
        id:           `truck-${i}`,
        medicine:     s.medicine,
        priority:     s.priority || "Normal",
        progress:     Math.random() * 10,
        hasTraffic:   false,
        routePath:    "standard" as const,
        routeData:    route,
        speedConfig:  0.18 + Math.random() * 0.25,
        trafficTrigger: 30 + Math.random() * 25,
        traffic:      null,
        policeAlert:  null,
        alertSent:    false,
        rerouted:     false,
      };
    })
  );

  const [activeModal, setActiveModal] = useState<PoliceAlert | null>(null);
  const [log, setLog]     = useState<string[]>([]);
  const pollingRef        = useRef<NodeJS.Timeout | null>(null);
  const animRef           = useRef<NodeJS.Timeout | null>(null);
  const sentAlertsRef     = useRef<Set<string>>(new Set()); // persists across renders

  const addLog = (msg: string) =>
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0,14)]);

  // ── Fetch real traffic for all truck routes on mount ──────────────────
  useEffect(() => {
    const fetchAllTraffic = async () => {
      const updated = await Promise.all(
        trucks.map(async (truck) => {
          try {
            const res = await fetch("http://127.0.0.1:5000/api/check-traffic", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ origin: truck.routeData.originName, destination: truck.routeData.destName }),
            });
            const data: TrafficData = await res.json();
            return { ...truck, traffic: data, hasTraffic: data.needs_clearance };
          } catch {
            return truck;
          }
        })
      );
      setTrucks(updated);
      updated.forEach(t => {
        if (t.traffic) {
          addLog(`Traffic check: ${t.routeData.originName} to ${t.routeData.destName} — ${t.traffic.level} (${t.traffic.source})`);
        }
      });
    };

    fetchAllTraffic();

    // Re-poll traffic every 60 seconds
    pollingRef.current = setInterval(fetchAllTraffic, 60000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  // ── Auto-dispatch police SMS — ref guard prevents duplicate calls ────
  useEffect(() => {
    trucks.forEach(truck => {
      if (
        truck.hasTraffic &&
        truck.traffic?.needs_clearance &&
        truck.progress > 20 &&
        truck.routePath === "standard" &&
        !sentAlertsRef.current.has(truck.id)
      ) {
        sentAlertsRef.current.add(truck.id);
        addLog(`Dispatching police alert for ${truck.medicine} — ${truck.routeData.originName} to ${truck.routeData.destName}...`);

        const dispatch = async () => {
          try {
            const res = await fetch("http://127.0.0.1:5000/api/police-alert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                truck_id:      truck.id,
                origin:        truck.routeData.originName,
                destination:   truck.routeData.destName,
                medicine:      truck.medicine,
                priority:      truck.priority,
                delay_minutes: truck.traffic!.delay_minutes,
                traffic_level: truck.traffic!.level,
              }),
            });
            const data = await res.json();
            const alert: PoliceAlert = {
              truck_number:  data.truck_number,
              sms_sent:      data.sms_result?.sent ?? false,
              sms_simulated: data.sms_result?.simulated ?? true,
              sms_message:   data.sms_result?.message ?? "",
              timestamp:     data.alert?.timestamp ?? new Date().toISOString(),
              status:        "clearance_requested",
            };
            setTrucks(prev => prev.map(t => t.id === truck.id ? { ...t, policeAlert: alert } : t));
            addLog(`Police SMS dispatched — Truck ${data.truck_number} — ${data.sms_result?.sent ? "Delivered" : "Simulated"}`);
          } catch {
            addLog(`Police alert failed for ${truck.id} — backend unreachable`);
          }
        };
        dispatch();
      }
    });
  }, [trucks]);

  // ── Animation loop ────────────────────────────────────────────────────
  useEffect(() => {
    animRef.current = setInterval(() => {
      setTrucks(prev => prev.map(truck => {
        const speed = truck.hasTraffic && truck.routePath === "standard"
          ? truck.speedConfig * 0.25
          : truck.speedConfig;
        let progress = truck.progress + speed;

        if (progress >= 100) {
          return {
            ...truck, progress: 0, hasTraffic: false,
            routePath: "standard" as const, alertSent: false, policeAlert: null,
          };
        }
        return { ...truck, progress };
      }));
    }, 100);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, []);

  // ── AI Reroute ────────────────────────────────────────────────────────
  const handleReroute = async (truckId: string) => {
    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return;

    setTrucks(prev => prev.map(t =>
      t.id === truckId ? { ...t, routePath: "fast" as const, hasTraffic: false, rerouted: true } : t
    ));
    addLog(`AI rerouted ${truck.medicine} — switching to bypass route`);

    try {
      await fetch("http://127.0.0.1:5000/api/reroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truck_id: truckId, origin: truck.routeData.originName, destination: truck.routeData.destName }),
      });
    } catch { /* non-critical */ }
  };

  const trucksNeedingAction = trucks.filter(t => t.hasTraffic && t.routePath === "standard");

  return (
    <div className="space-y-4">

      {/* ── Status bar ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">

        {trucksNeedingAction.length > 0 ? (
          <div className="space-y-2">
            {trucksNeedingAction.map(truck => (
              <div key={`alert-${truck.id}`}
                className="flex flex-col md:flex-row items-start md:items-center justify-between bg-orange-50 border border-orange-300 p-3 rounded-lg gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-orange-700">
                      Traffic Delay — {truck.medicine}
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {truck.routeData.originName} to {truck.routeData.destName} &middot;&nbsp;
                      {truck.traffic ? (
                        <><TrafficBadge level={truck.traffic.level} /> &nbsp;
                        {truck.traffic.delay_minutes > 0 ? `${truck.traffic.delay_minutes} min delay` : "congestion detected"}</>
                      ) : "checking..."}
                    </p>
                    {truck.policeAlert && (
                      <button
                        onClick={() => setActiveModal(truck.policeAlert)}
                        className="mt-1.5 text-xs text-blue-600 underline font-medium flex items-center gap-1"
                      >
                        <MessageSquare size={11} /> Police SMS sent — view details
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleReroute(truck.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors flex-shrink-0 shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  AI Reroute
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-emerald-700 font-medium p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Activity className="w-5 h-5" />
            <span className="text-sm">Pan-India Network Online — 4 trucks tracked, all routes clear</span>
            <span className="ml-auto text-xs text-emerald-600">
              "Live" traffic data
            </span>
          </div>
        )}

        {/* ── Telemetry grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {trucks.map(truck => (
            <div key={`tel-${truck.id}`} className={`p-3 border rounded-lg ${
              truck.hasTraffic ? "border-orange-200 bg-orange-50/50" :
              truck.rerouted  ? "border-emerald-200 bg-emerald-50/50" : "bg-background border-border"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-foreground text-xs truncate pr-1">{truck.medicine}</p>
                {truck.rerouted && <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {truck.routeData.originName} &rarr; {truck.routeData.destName}
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    truck.rerouted ? "bg-emerald-500" : truck.hasTraffic ? "bg-orange-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.round(truck.progress)}%` }}
                />
              </div>

              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={`text-xs font-bold ${
                  truck.rerouted   ? "text-emerald-600" :
                  truck.hasTraffic ? "text-orange-500"  : "text-blue-500"
                }`}>
                  {truck.rerouted ? "Rerouted" : truck.hasTraffic ? "Delayed" : "On Time"}
                </span>
              </div>

              {truck.traffic && (
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Traffic</span>
                  <TrafficBadge level={truck.traffic.level} />
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Route</span>
                <span className={`text-xs font-bold ${truck.routePath==="fast" ? "text-emerald-600" : "text-foreground"}`}>
                  {truck.routePath==="fast" ? "AI Bypass" : "Highway"}
                </span>
              </div>

              {truck.policeAlert && (
                <button
                  onClick={() => setActiveModal(truck.policeAlert)}
                  className="mt-2 w-full text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 font-medium flex items-center justify-center gap-1"
                >
                  <Shield size={10} /> View Police Alert
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaflet Map ── */}
      <div className="relative border-2 border-border rounded-xl shadow-sm overflow-hidden" style={{ height: "520px" }}>
        <MapContainer center={[20.5, 78.5]} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {trucks.map(truck => {
            const currentRoute = truck.routePath === "standard" ? truck.routeData.std : truck.routeData.fast;
            const currentPos   = interpolate(currentRoute, truck.progress);
            const tc           = truck.traffic ? trafficColor(truck.traffic.level) : "#3b82f6";

            return (
              <div key={`map-${truck.id}`}>
                {/* Standard route — split into segments to show traffic color */}
                {truck.routePath === "standard" && (
                  <>
                    <Polyline
                      positions={truck.routeData.std.slice(0,2)}
                      pathOptions={{ color: "#3b82f6", weight: 3.5, opacity: 0.7 }}
                    />
                    <Polyline
                      positions={truck.routeData.std.slice(1)}
                      pathOptions={{
                        color: truck.hasTraffic ? tc : "#3b82f6",
                        weight: truck.hasTraffic ? 5 : 3.5,
                        dashArray: truck.hasTraffic ? "10,6" : undefined,
                        opacity: 0.85,
                      }}
                    />
                  </>
                )}

                {/* AI bypass route */}
                {truck.routePath === "fast" && (
                  <Polyline
                    positions={truck.routeData.fast}
                    pathOptions={{ color: "#10b981", weight: 4, opacity: 0.85 }}
                  />
                )}

                {/* Origin — F for Factory */}
                <Marker position={truck.routeData.std[0]} icon={originIcon}>
                  <Popup>
                    <strong>{truck.routeData.originName} — Dispatch Facility</strong>
                  </Popup>
                </Marker>

                {/* Destination — H for Hospital */}
                <Marker position={truck.routeData.std[truck.routeData.std.length - 1]} icon={destIcon}>
                  <Popup>
                    <strong>{truck.routeData.destName} — Hospital</strong>
                  </Popup>
                </Marker>

                {/* Moving truck */}
                <Marker
                  position={currentPos}
                  icon={makeTruckIcon(truck.hasTraffic, truck.rerouted, truck.medicine.split(" ")[0])}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <strong>{truck.medicine}</strong><br/>
                    Route: {truck.routeData.originName} &rarr; {truck.routeData.destName}<br/>
                    Progress: {Math.round(truck.progress)}%<br/>
                    Status: {truck.rerouted ? "AI Rerouted" : truck.hasTraffic ? "Delayed" : "On Time"}<br/>
                    {truck.traffic && <>Traffic: {truck.traffic.level} ({truck.traffic.delay_minutes} min delay)<br/></>}
                    {truck.policeAlert && <>Truck No: {truck.policeAlert.truck_number}</>}
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 p-3 shadow-sm z-[1000]">
          <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Legend</p>
          <div className="space-y-1.5">
            {[
              { color: "#2563eb", label: "Normal route" },
              { color: "#f97316", label: "Traffic detected", dashed: true },
              { color: "#10b981", label: "AI bypass route" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div style={{
                  width: 24, height: 3,
                  background: item.color,
                  borderRadius: 2,
                  backgroundImage: item.dashed ? `repeating-linear-gradient(90deg,${item.color} 0,${item.color} 4px,transparent 4px,transparent 8px)` : undefined,
                  backgroundColor: item.dashed ? "transparent" : item.color,
                }} />
                <span className="text-xs text-slate-600">{item.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <div style={{width:14,height:14,background:"#1e293b",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{color:"white",fontSize:7,fontWeight:"bold"}}>F</span>
              </div>
              <span className="text-xs text-slate-600">Factory</span>
              <div style={{width:14,height:14,background:"#059669",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",marginLeft:4}}>
                <span style={{color:"white",fontSize:7,fontWeight:"bold"}}>H</span>
              </div>
              <span className="text-xs text-slate-600">Hospital</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity log ── */}
      {log.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={13} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI System Log</p>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {log.map((entry, i) => (
              <p key={i} className={`text-xs font-mono ${i===0 ? "text-emerald-400" : "text-slate-500"}`}>
                {entry}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Police alert modal */}
      {activeModal && (
        <PoliceSmsModal alert={activeModal} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function LiveMap() {
  const shipments = useAppStore(s => s.shipments) || [];
  const inTransit = shipments.filter(s => s.status === "In Transit");

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Command Center</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time Pan-India truck tracking with live traffic monitoring and automatic police clearance alerts.
          </p>
        </div>

        <MultiTrackerMap shipments={inTransit} />

        {/* Shipment cards */}
        {inTransit.length > 0 && (
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">Tracked Shipments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inTransit.map(s => (
                <div key={s.id} className={`bg-card rounded-lg border p-4 shadow-sm ${
                  s.priority==="Emergency" ? "border-red-400" : "border-border"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground text-sm">{s.medicine}</span>
                    <RiskBadge level={s.riskLevel} />
                  </div>
                  <p className="text-xs text-muted-foreground">{s.origin} &rarr; {s.destination}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} /> ETA: <strong className="text-foreground ml-1">{s.eta}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.transportMode}</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}