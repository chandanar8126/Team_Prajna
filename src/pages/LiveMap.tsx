import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, FastForward, Activity } from "lucide-react";

// --- CUSTOM MAP ICONS ---
const originIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="flex items-center justify-center w-8 h-8 bg-slate-800 border-2 border-white rounded-full shadow-lg text-sm">🏭</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="flex items-center justify-center w-8 h-8 bg-emerald-600 border-2 border-white rounded-full shadow-lg text-sm">🏥</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const createTruckIcon = (isTraffic: boolean, label: string) => L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex flex-col items-center">
          <div class="bg-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap mb-1 text-slate-800">
            ${label}
          </div>
          <div class="flex items-center justify-center w-7 h-7 ${isTraffic ? 'bg-orange-500 animate-pulse' : 'bg-blue-600'} border-2 border-white rounded shadow-lg text-xs">🚚</div>
         </div>`,
  iconSize: [32, 48],
  iconAnchor: [16, 24],
});

// --- PAN-INDIA DEMO ROUTES ---
// We define 4 distinct physical routes to show a massive logistics network
const ROUTES = [
  {
    originName: "Mumbai", destName: "Pune",
    std: [[19.076, 72.877], [18.75, 73.40], [18.520, 73.856]] as [number, number][],
    fast: [[19.076, 72.877], [18.90, 73.20], [18.65, 73.65], [18.520, 73.856]] as [number, number][],
  },
  {
    originName: "Delhi", destName: "Agra",
    std: [[28.613, 77.209], [27.80, 77.60], [27.176, 78.008]] as [number, number][],
    fast: [[28.613, 77.209], [28.10, 77.80], [27.50, 77.90], [27.176, 78.008]] as [number, number][],
  },
  {
    originName: "Bangalore", destName: "Mysore",
    std: [[12.971, 77.594], [12.50, 77.00], [12.295, 76.639]] as [number, number][],
    fast: [[12.971, 77.594], [12.70, 77.30], [12.40, 76.80], [12.295, 76.639]] as [number, number][],
  },
  {
    originName: "Chennai", destName: "Vellore",
    std: [[13.082, 80.270], [12.90, 79.80], [12.916, 79.132]] as [number, number][],
    fast: [[13.082, 80.270], [13.20, 79.80], [13.10, 79.40], [12.916, 79.132]] as [number, number][],
  }
];

// --- HELPER FUNCTION ---
const interpolatePosition = (points: [number, number][], progressPercent: number): [number, number] => {
  const totalSegments = points.length - 1;
  const scaledProgress = (progressPercent / 100) * totalSegments;
  
  let currentSegment = Math.floor(scaledProgress);
  if (currentSegment >= totalSegments) currentSegment = totalSegments - 1; 
  
  const segmentProgress = scaledProgress - currentSegment;
  const start = points[currentSegment];
  const end = points[currentSegment + 1];

  return [
    start[0] + (end[0] - start[0]) * segmentProgress,
    start[1] + (end[1] - start[1]) * segmentProgress,
  ];
};

// --- THE INTERACTIVE MAP COMPONENT ---
function MultiTrackerMap({ shipments }: { shipments: any[] }) {
  // Setup 4 independent tracking states
  const [trucks, setTrucks] = useState(() => {
    return ROUTES.map((route, index) => {
      // Use real shipment data if available, otherwise fallback to demo data
      const shipment = shipments[index] || { medicine: `Medical Supply ${index + 1}` };
      return {
        id: `truck-${index}`,
        medicine: shipment.medicine,
        progress: Math.random() * 15, // Start them at slightly different positions
        hasTraffic: false,
        routePath: 'standard' as 'standard' | 'fast',
        routeData: route,
        speedConfig: 0.2 + (Math.random() * 0.3), // Different speeds for realism
        trafficTrigger: 25 + (Math.random() * 20), // Traffic hits at different points
      };
    });
  });

  // Auto-Loop Animation for all 4 trucks
  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks((prevTrucks) => prevTrucks.map(truck => {
        const speed = truck.hasTraffic ? 0.05 : truck.speedConfig;
        let newProgress = truck.progress + speed;
        let newTraffic = truck.hasTraffic;
        let newRoutePath = truck.routePath;

        // Auto-Trigger Traffic
        if (newProgress > truck.trafficTrigger && newProgress < truck.trafficTrigger + 5 && truck.routePath === 'standard' && !truck.hasTraffic) {
          newTraffic = true;
        }

        // Endless loop: Reset to start when it reaches the destination
        if (newProgress >= 100) {
          newProgress = 0;
          newTraffic = false;
          newRoutePath = 'standard';
        }

        return { ...truck, progress: newProgress, hasTraffic: newTraffic, routePath: newRoutePath };
      }));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // AI Reroute Action for a specific truck
  const handleReroute = (truckId: string) => {
    setTrucks(prev => prev.map(t => 
      t.id === truckId ? { ...t, routePath: 'fast', hasTraffic: false } : t
    ));
  };

  if (typeof window === "undefined") return null;

  const trucksInTraffic = trucks.filter(t => t.hasTraffic && t.routePath === 'standard');

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* ALERTS & TELEMETRY */}
      <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
        
        {/* Dynamic AI Alert Banners (Stacks if multiple trucks hit traffic) */}
        {trucksInTraffic.length > 0 ? (
          <div className="space-y-2">
            {trucksInTraffic.map(truck => (
              <div key={`alert-${truck.id}`} className="flex flex-col md:flex-row items-center justify-between bg-orange-500/10 border border-orange-500/50 p-3 rounded-lg gap-3 animate-fade-in-up">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <span>Traffic Delay: {truck.medicine} ({truck.routeData.originName} → {truck.routeData.destName})</span>
                </div>
                <button 
                  onClick={() => handleReroute(truck.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium animate-pulse transition-colors w-full md:w-auto justify-center shadow-md"
                >
                  <FastForward className="w-4 h-4" />
                  AI Reroute
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
            <Activity className="w-5 h-5" />
            <span>Pan-India System Online: Monitoring 4 Active Shipments</span>
          </div>
        )}

        {/* 4-Grid Telemetry Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {trucks.map(truck => (
            <div key={`telemetry-${truck.id}`} className="p-3 border rounded-lg bg-background">
              <p className="font-bold text-foreground text-sm truncate">{truck.medicine}</p>
              <p className="text-xs text-muted-foreground mb-2">{truck.routeData.originName} → {truck.routeData.destName}</p>
              
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs uppercase font-semibold text-muted-foreground">Status</span>
                <span className={`text-xs font-bold ${truck.hasTraffic ? 'text-orange-500' : 'text-blue-500'}`}>
                  {truck.hasTraffic ? "Delayed" : "On Time"}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase font-semibold text-muted-foreground">Route</span>
                <span className={`text-xs font-bold ${truck.routePath === 'fast' ? 'text-emerald-500' : 'text-foreground'}`}>
                  {truck.routePath === 'fast' ? "AI Bypass" : "Highway"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THE LEAFLET MAP */}
      <div className="relative border-2 border-border rounded-xl shadow-md overflow-hidden z-0" style={{ height: "550px" }}>
        {/* Zoom level 5 and center [21.0, 78.0] perfectly frames India */}
        <MapContainer center={[21.0, 78.0]} zoom={5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {trucks.map(truck => {
            const currentRoute = truck.routePath === 'standard' ? truck.routeData.std : truck.routeData.fast;
            const currentPos = interpolatePosition(currentRoute, truck.progress);

            return (
              <div key={`map-elements-${truck.id}`}>
                {/* Standard Route Line */}
                {truck.routePath === 'standard' && (
                  <>
                    <Polyline positions={[truck.routeData.std[0], truck.routeData.std[1]]} pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.6 }} />
                    <Polyline 
                      positions={[truck.routeData.std[1], truck.routeData.std[2]]} 
                      pathOptions={{ 
                        color: truck.hasTraffic ? "#f97316" : "#3b82f6", 
                        weight: truck.hasTraffic ? 5 : 3, 
                        dashArray: truck.hasTraffic ? "8, 8" : "none",
                        opacity: 0.8
                      }} 
                    />
                  </>
                )}

                {/* Fast Route Line */}
                {truck.routePath === 'fast' && (
                  <Polyline positions={truck.routeData.fast} pathOptions={{ color: "#10b981", weight: 4, opacity: 0.8 }} />
                )}

                {/* Origin Marker */}
                <Marker position={truck.routeData.std[0]} icon={originIcon}>
                  <Popup><strong>{truck.routeData.originName} Facility</strong></Popup>
                </Marker>

                {/* Destination Marker */}
                <Marker position={truck.routeData.std[truck.routeData.std.length - 1]} icon={destIcon}>
                  <Popup><strong>{truck.routeData.destName} Hospital</strong></Popup>
                </Marker>

                {/* The Moving Truck */}
                <Marker position={currentPos} icon={createTruckIcon(truck.hasTraffic, truck.medicine.split(" ")[0])} zIndexOffset={1000}>
                  <Popup>
                    <strong>{truck.medicine}</strong><br/>
                    Progress: {Math.round(truck.progress)}%
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LiveMap() {
  const shipments = useAppStore((s) => s.shipments) || [];
  const inTransit = shipments.filter((s) => s.status === "In Transit");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Command Center</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitoring active Pan-India deliveries</p>
        </div>

        {/* The 4-Truck Interactive Map */}
        <MultiTrackerMap shipments={inTransit} />

        {/* Database Shipment Cards */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">All Tracking Shipments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inTransit.map((s) => (
              <div
                key={s.id}
                className={`bg-card rounded-lg border p-4 shadow-card ${
                  s.priority === "Emergency" ? "border-emergency animate-pulse-glow" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground text-sm">{s.medicine}</span>
                  <RiskBadge level={s.riskLevel} />
                </div>
                <p className="text-xs text-muted-foreground">{s.origin} → {s.destination}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">ETA: <strong className="text-foreground">{s.eta}</strong></span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}