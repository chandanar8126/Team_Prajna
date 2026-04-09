import { DashboardLayout } from "@/components/DashboardLayout";
import { RiskBadge } from "@/components/RiskBadge";
import { useAppStore } from "@/lib/store";
import React, { useState } from "react";

export default function Shipments() {
  const shipments = useAppStore((s) => s.shipments);
  const [selectedShipment, setSelectedShipment] = useState<typeof shipments[0] | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Shipments</h2>
          <p className="text-muted-foreground text-sm mt-1">{shipments.length} total shipments</p>
        </div>

        {/* Shipments Table */}
        <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">ID</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Medicine</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Supplier</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Route</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">ETA</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-t border-border hover:bg-muted/30 transition-colors cursor-pointer animate-fade-in-up ${
                      s.priority === "Emergency" ? "bg-risk-high/5" : ""
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => setSelectedShipment(s)}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{s.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{s.medicine}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.supplierName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.origin} → {s.destination}</td>
                    <td className="px-5 py-3 font-mono text-foreground">{s.eta}</td>
                    <td className="px-5 py-3"><RiskBadge level={s.riskLevel} /></td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        s.status === "Delivered" ? "bg-success/10 text-success" :
                        s.status === "Delayed" ? "bg-risk-high/10 text-risk-high" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.priority === "Emergency" && <span className="text-xs font-bold text-emergency">🚨 EMERGENCY</span>}
                      {s.priority === "High" && <span className="text-xs font-semibold text-warning">⚡ High</span>}
                      {s.priority === "Normal" && <span className="text-xs text-muted-foreground">Normal</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for shipment details */}
        {selectedShipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg p-6 w-11/12 max-w-lg relative animate-fade-in-up">
              <h3 className="text-xl font-bold text-foreground mb-4">Shipment Details</h3>
              <div className="space-y-2 text-sm text-foreground">
                <p><strong>ID:</strong> {selectedShipment.id}</p>
                <p><strong>Medicine:</strong> {selectedShipment.medicine}</p>
                <p><strong>Supplier:</strong> {selectedShipment.supplierName}</p>
                <p><strong>Route:</strong> {selectedShipment.origin} → {selectedShipment.destination}</p>
                <p><strong>ETA:</strong> {selectedShipment.eta}</p>
                <p><strong>Risk Level:</strong> <RiskBadge level={selectedShipment.riskLevel} /></p>
                <p><strong>Status:</strong> {selectedShipment.status}</p>
                <p><strong>Priority:</strong> {selectedShipment.priority}</p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
