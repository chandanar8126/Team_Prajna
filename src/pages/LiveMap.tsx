import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { cities } from "@/lib/data";
import { RiskBadge } from "@/components/RiskBadge";
import type { Shipment } from "@/lib/data";

// Simple SVG-based map of US with plotted shipments
function MapView({ shipments }: { shipments: Shipment[] }) {
  const [animProgress, setAnimProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    shipments.forEach((s) => {
      initial[s.id] = s.progress;
    });
    setAnimProgress(initial);

    const interval = setInterval(() => {
      setAnimProgress((prev) => {
        const next = { ...prev };
        shipments.forEach((s) => {
          if (s.status === "In Transit" && (next[s.id] ?? 0) < 100) {
            next[s.id] = Math.min((next[s.id] ?? s.progress) + 0.3, 100);
          }
        });
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [shipments]);

  // Map city coords to SVG space (simple projection)
  const toSvg = (lat: number, lng: number) => {
    const x = ((lng + 125) / 65) * 800;
    const y = ((50 - lat) / 28) * 500;
    return { x, y };
  };

  const inTransit = shipments.filter((s) => s.status === "In Transit");

  return (
    <div className="relative bg-card rounded-lg border border-border overflow-hidden">
      <svg viewBox="0 0 800 500" className="w-full h-auto" style={{ minHeight: 400 }}>
        {/* Background */}
        <rect width="800" height="500" fill="hsl(210 20% 96%)" />
        
        {/* Grid lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 62.5} x2="800" y2={i * 62.5} stroke="hsl(210 20% 90%)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 61.5} y1="0" x2={i * 61.5} y2="500" stroke="hsl(210 20% 90%)" strokeWidth="0.5" />
        ))}

        {/* US outline approximation */}
        <path
          d="M 80,120 Q 120,80 200,90 Q 300,70 400,85 Q 500,75 600,90 Q 680,100 720,130 Q 740,180 730,240 Q 720,300 680,340 Q 620,380 560,390 Q 480,400 400,380 Q 320,370 260,350 Q 200,340 150,300 Q 100,260 80,200 Z"
          fill="hsl(210 30% 92%)"
          stroke="hsl(210 20% 80%)"
          strokeWidth="1.5"
        />

        {/* Shipment routes */}
        {inTransit.map((s) => {
          const o = cities[s.origin];
          const d = cities[s.destination];
          if (!o || !d) return null;
          const start = toSvg(o.lat, o.lng);
          const end = toSvg(d.lat, d.lng);
          const progress = (animProgress[s.id] ?? s.progress) / 100;
          const currentX = start.x + (end.x - start.x) * progress;
          const currentY = start.y + (end.y - start.y) * progress;
          const isEmergency = s.priority === "Emergency";

          return (
            <g key={s.id}>
              {/* Route line */}
              <line
                x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                stroke={isEmergency ? "hsl(0 75% 55%)" : "hsl(210 90% 45%)"}
                strokeWidth={isEmergency ? 2.5 : 1.5}
                strokeDasharray={isEmergency ? "none" : "6 3"}
                opacity={0.6}
              />
              {/* Traveled portion */}
              <line
                x1={start.x} y1={start.y} x2={currentX} y2={currentY}
                stroke={isEmergency ? "hsl(0 75% 55%)" : "hsl(210 90% 45%)"}
                strokeWidth={isEmergency ? 3 : 2}
              />
              {/* Vehicle marker */}
              <g>
                {isEmergency && (
                  <circle cx={currentX} cy={currentY} r="12" fill="hsl(0 75% 55%)" opacity="0.2">
                    <animate attributeName="r" values="12;20;12" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={currentX} cy={currentY} r="6" fill={isEmergency ? "hsl(0 75% 55%)" : "hsl(210 90% 45%)"} stroke="white" strokeWidth="2" />
                <text x={currentX} y={currentY - 12} textAnchor="middle" fontSize="8" fill="hsl(215 25% 15%)" fontWeight="600">
                  {s.medicine.split(" ")[0]}
                </text>
              </g>
              {/* Origin marker */}
              <circle cx={start.x} cy={start.y} r="4" fill="hsl(145 65% 42%)" stroke="white" strokeWidth="1.5" />
              {/* Destination marker */}
              <rect x={end.x - 4} y={end.y - 4} width="8" height="8" rx="2" fill="hsl(210 90% 45%)" stroke="white" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* City labels */}
        {Object.entries(cities).map(([name, coords]) => {
          const pos = toSvg(coords.lat, coords.lng);
          return (
            <text key={name} x={pos.x} y={pos.y + 16} textAnchor="middle" fontSize="7" fill="hsl(215 15% 50%)" fontWeight="500">
              {name}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-1">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-risk-high" />Emergency</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" />Normal/High</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success" />Origin</div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />Destination</div>
      </div>
    </div>
  );
}

export default function LiveMap() {
  const shipments = useAppStore((s) => s.shipments);
  const inTransit = shipments.filter((s) => s.status === "In Transit");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Map Tracking</h2>
          <p className="text-muted-foreground text-sm mt-1">{inTransit.length} shipments in transit</p>
        </div>

        <MapView shipments={shipments} />

        {/* Shipment cards below map */}
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
    </DashboardLayout>
  );
}
